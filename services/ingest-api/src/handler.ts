import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SQS, DynamoDB } from 'aws-sdk';
import { randomUUID } from 'crypto';

const sqs = new SQS();
const dynamodb = new DynamoDB.DocumentClient();
const QUEUE_URL = process.env.EVENT_QUEUE_URL;
const TABLE_NAME = process.env.EVENT_TABLE_NAME;

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
];

/**
 * Generate CORS headers based on the request origin
 */
function corsHeaders(event: APIGatewayProxyEvent): Record<string, string> {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Headers': 'content-type,authorization,x-amz-date,x-api-key,x-amz-security-token',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
    'Vary': 'Origin',
  };

  // If origin is in allowed list, return it explicitly
  if (ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else if (origin) {
    // For any other origin, allow it (permissive for now)
    headers['Access-Control-Allow-Origin'] = origin;
  } else {
    // No origin header, set wildcard
    headers['Access-Control-Allow-Origin'] = '*';
  }

  return headers;
}

interface EventPayload {
  id: string;
  type: string;
  timestamp: string;
  data: any;
  requestId: string;
}

interface IncomingEventData {
  id?: string;
  type?: string;
  timestamp?: string;
  data?: any;
  requestId?: string;
}

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

interface LogContext {
  level: LogLevel;
  service: string;
  message: string;
  eventId?: string;
  requestId?: string;
  timestamp: string;
  meta?: Record<string, any>;
}

/**
 * Structured logging helper for CloudWatch
 */
function log(level: LogLevel, message: string, context?: Partial<Omit<LogContext, 'level' | 'service' | 'message' | 'timestamp'>>): void {
  const logEntry: LogContext = {
    level,
    service: 'ingest-api',
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };
  console.log(JSON.stringify(logEntry));
}

/**
 * Handle GET /events/recent - fetch recent events from DynamoDB GSI
 */
async function handleGetRecentEvents(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  if (!TABLE_NAME) {
    log('ERROR', 'EVENT_TABLE_NAME environment variable is not set');
    return {
      statusCode: 500,
      headers: corsHeaders(event),
      body: JSON.stringify({
        error: 'Service configuration error',
      }),
    };
  }

  try {
    // Parse query parameters
    const limit = Math.min(
      parseInt(event.queryStringParameters?.limit || '25', 10),
      100
    );
    const typeFilter = event.queryStringParameters?.type;

    log('INFO', 'Fetching recent events', {
      meta: { limit, typeFilter },
    });

    // Query GSI1 for recent events
    const params: DynamoDB.DocumentClient.QueryInput = {
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'gsi1pk = :pk',
      ExpressionAttributeValues: {
        ':pk': 'RECENT',
      },
      ScanIndexForward: false, // Newest first
      Limit: limit,
    };

    // Add type filter if provided
    if (typeFilter) {
      params.FilterExpression = '#t = :type';
      params.ExpressionAttributeNames = {
        '#t': 'type',
      };
      params.ExpressionAttributeValues![':type'] = typeFilter;
    }

    const result = await dynamodb.query(params).promise();

    // Map to response format
    const items = (result.Items || []).map(item => ({
      id: item.pk?.replace('EVENT#', '') || '',
      type: item.type,
      timestamp: item.timestamp,
      data: item.data || {},
      requestId: item.requestId,
    }));

    log('INFO', 'Successfully fetched recent events', {
      meta: { count: items.length, hasMore: !!result.LastEvaluatedKey },
    });

    return {
      statusCode: 200,
      headers: corsHeaders(event),
      body: JSON.stringify({
        items,
        count: items.length,
        nextToken: result.LastEvaluatedKey
          ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
          : undefined,
      }),
    };
  } catch (error) {
    log('ERROR', 'Failed to fetch recent events', {
      meta: {
        error: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : undefined,
      },
    });
    return {
      statusCode: 500,
      headers: corsHeaders(event),
      body: JSON.stringify({
        error: 'Failed to fetch recent events',
      }),
    };
  }
}

/**
 * Handle POST /events - ingest event to SQS
 */
async function handlePostEvent(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  // Validate queue URL is configured
  if (!QUEUE_URL) {
    log('ERROR', 'EVENT_QUEUE_URL environment variable is not set');
    return {
      statusCode: 500,
      headers: corsHeaders(event),
      body: JSON.stringify({
        error: 'Service configuration error',
      }),
    };
  }

  // Parse and validate request body
  let incomingData: IncomingEventData;
  try {
    if (!event.body) {
      log('WARN', 'Request body is missing');
      return {
        statusCode: 400,
        headers: corsHeaders(event),
        body: JSON.stringify({
          error: 'Request body is required',
        }),
      };
    }

    incomingData = JSON.parse(event.body);

    // Validate required fields
    if (!incomingData.type || typeof incomingData.type !== 'string') {
      log('WARN', 'Validation failed: missing or invalid type field', {
        meta: { hasType: !!incomingData.type },
      });
      return {
        statusCode: 400,
        headers: corsHeaders(event),
        body: JSON.stringify({
          error: 'Field "type" is required and must be a string',
        }),
      };
    }

    if (incomingData.data === undefined) {
      log('WARN', 'Validation failed: missing data field', {
        meta: { type: incomingData.type },
      });
      return {
        statusCode: 400,
        headers: corsHeaders(event),
        body: JSON.stringify({
          error: 'Field "data" is required',
        }),
      };
    }
  } catch (error) {
    log('ERROR', 'Failed to parse request body', {
      meta: { error: error instanceof Error ? error.message : String(error) },
    });
    return {
      statusCode: 400,
      headers: corsHeaders(event),
      body: JSON.stringify({
        error: 'Invalid JSON in request body',
      }),
    };
  }

  // Build event object
  const eventPayload: EventPayload = {
    id: incomingData.id || randomUUID(),
    type: incomingData.type,
    timestamp: incomingData.timestamp || new Date().toISOString(),
    data: incomingData.data,
    requestId: incomingData.requestId || randomUUID(),
  };

  log('INFO', 'Validated request body', {
    eventId: eventPayload.id,
    requestId: eventPayload.requestId,
    meta: { type: eventPayload.type },
  });

  // Send to SQS
  try {
    const params: SQS.SendMessageRequest = {
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify(eventPayload),
      MessageAttributes: {
        eventType: {
          DataType: 'String',
          StringValue: eventPayload.type,
        },
        eventId: {
          DataType: 'String',
          StringValue: eventPayload.id,
        },
      },
    };

    const result = await sqs.sendMessage(params).promise();
    
    log('INFO', 'Enqueued message to SQS', {
      eventId: eventPayload.id,
      requestId: eventPayload.requestId,
      meta: { sqsMessageId: result.MessageId },
    });

    log('INFO', 'Returning response to client', {
      eventId: eventPayload.id,
      requestId: eventPayload.requestId,
      meta: { statusCode: 202 },
    });

    return {
      statusCode: 202,
      headers: corsHeaders(event),
      body: JSON.stringify({
        accepted: true,
        event: {
          id: eventPayload.id,
          type: eventPayload.type,
          timestamp: eventPayload.timestamp,
        },
        messageId: result.MessageId,
      }),
    };
  } catch (error) {
    log('ERROR', 'Failed to send message to SQS', {
      eventId: eventPayload.id,
      requestId: eventPayload.requestId,
      meta: {
        error: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : undefined,
      },
    });
    return {
      statusCode: 500,
      headers: corsHeaders(event),
      body: JSON.stringify({
        error: 'Failed to process event',
      }),
    };
  }
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  log('INFO', 'Received request', {
    meta: { path: event.path, httpMethod: event.httpMethod },
  });

  // Route based on HTTP method and path
  if (event.httpMethod === 'GET' && event.path.endsWith('/events/recent')) {
    return handleGetRecentEvents(event);
  } else if (event.httpMethod === 'POST' && event.path.endsWith('/events')) {
    return handlePostEvent(event);
  } else {
    log('WARN', 'Unsupported route', {
      meta: { path: event.path, method: event.httpMethod },
    });
    return {
      statusCode: 404,
      headers: corsHeaders(event),
      body: JSON.stringify({
        error: 'Not found',
      }),
    };
  }
};

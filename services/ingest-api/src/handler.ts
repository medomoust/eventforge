import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SQS } from 'aws-sdk';
import { randomUUID } from 'crypto';

const sqs = new SQS();
const QUEUE_URL = process.env.EVENT_QUEUE_URL;

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

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  log('INFO', 'Received request', {
    meta: { path: event.path, httpMethod: event.httpMethod },
  });

  // Validate queue URL is configured
  if (!QUEUE_URL) {
    log('ERROR', 'EVENT_QUEUE_URL environment variable is not set');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to process event',
      }),
    };
  }
};

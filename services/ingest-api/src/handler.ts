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

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  // Validate queue URL is configured
  if (!QUEUE_URL) {
    console.error('EVENT_QUEUE_URL environment variable is not set');
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
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Field "type" is required and must be a string',
        }),
      };
    }

    if (incomingData.data === undefined) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Field "data" is required',
        }),
      };
    }
  } catch (error) {
    console.error('Failed to parse request body:', error);
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

  console.log('Built event payload:', JSON.stringify(eventPayload, null, 2));

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
    console.log('Successfully sent message to SQS:', result.MessageId);

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
    console.error('Failed to send message to SQS:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to process event',
      }),
    };
  }
};

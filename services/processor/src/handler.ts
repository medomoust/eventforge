import { SQSEvent, SQSHandler, SQSRecord } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const dynamodb = new AWS.DynamoDB.DocumentClient();
const EVENT_TABLE_NAME = process.env.EVENT_TABLE_NAME;

interface EventRecord {
  id?: string;
  type?: string;
  timestamp?: string;
  data?: Record<string, any>;
  requestId?: string;
}

/**
 * Safely parses and validates an event record from SQS message body
 */
function parseEventRecord(body: string, messageId: string): EventRecord {
  try {
    const parsed = JSON.parse(body);
    
    // Defensive: ensure we have at least the required fields
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid event: body is not an object');
    }
    
    return {
      id: parsed.id,
      type: parsed.type,
      timestamp: parsed.timestamp,
      data: parsed.data,
      requestId: parsed.requestId,
    };
  } catch (error) {
    console.error('Failed to parse event body:', {
      messageId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Processes a single SQS record and writes to DynamoDB with idempotency
 */
async function processRecord(record: SQSRecord): Promise<void> {
  if (!EVENT_TABLE_NAME) {
    throw new Error('EVENT_TABLE_NAME environment variable is not set');
  }

  const messageId = record.messageId;
  
  try {
    const event = parseEventRecord(record.body, messageId);
    
    // Validate required fields
    if (!event.id) {
      throw new Error('Missing required field: id');
    }
    if (!event.timestamp) {
      throw new Error('Missing required field: timestamp');
    }

    console.log('Processing event:', {
      id: event.id,
      type: event.type,
      timestamp: event.timestamp,
      messageId,
    });

    // Write to DynamoDB with idempotency via conditional put
    const pk = `EVENT#${event.id}`;
    const sk = 'v0';  // Constant version key for idempotency

    await dynamodb.put({
      TableName: EVENT_TABLE_NAME,
      Item: {
        pk,
        sk,
        type: event.type || null,
        timestamp: event.timestamp,
        data: event.data || {},
        requestId: event.requestId || null,
        raw: record.body,
        processedAt: new Date().toISOString(),
        sqsMessageId: messageId,
      },
      // Idempotency: prevent duplicate writes on retry
      ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
    }).promise();

    console.log('Successfully processed event:', {
      id: event.id,
      pk,
      sk,
      messageId,
    });
  } catch (error) {
    // Handle conditional check failure (duplicate) differently
    if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
      console.warn('Event already processed (idempotent):', {
        messageId,
        reason: 'duplicate',
      });
      // Don't throw - this is expected on retry
      return;
    }

    console.error('Error processing record:', {
      messageId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Lambda handler for SQS-triggered event processing
 */
export const handler: SQSHandler = async (event: SQSEvent): Promise<void> => {
  console.log('Received SQS batch:', {
    recordCount: event.Records.length,
  });

  const results = await Promise.allSettled(
    event.Records.map(record => processRecord(record))
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  const total = results.length;
  
  console.log('Batch processing summary:', {
    ok: succeeded,
    failed,
    total,
  });

  if (failed > 0) {
    console.error(`Failed to process ${failed} out of ${total} records`);
    // Throwing will cause the batch to be retried and eventually sent to DLQ
    throw new Error(`Failed to process ${failed} records`);
  }

  console.log(`Successfully processed all ${total} records`);
};

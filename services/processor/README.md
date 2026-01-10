# Event Processor

AWS Lambda function that processes events from an SQS queue and stores them in DynamoDB.

## What It Does

This Lambda function is triggered by SQS messages containing event data. It processes incoming events and persists them to a DynamoDB table for downstream analytics and querying.

**Idempotency:** The processor uses conditional writes to ensure that events with the same `id` are written exactly once. Duplicate events (e.g., from SQS retries) are safely ignored and logged without throwing errors.

**DynamoDB Key Schema:**
- Partition Key: `pk = "EVENT#" + id`
- Sort Key: `sk = "v0"` (constant version key)
- `timestamp` is stored as a regular attribute

## Environment Variables

- `EVENT_TABLE_NAME` (required): The name of the DynamoDB table where events will be stored

## Build

To build the Lambda function bundle:

```bash
npm run build
```

This will bundle `src/handler.ts` to `dist/handler.js` using esbuild, targeting Node.js 20 runtime.

## Test

```bash
npm test
```

## Deployment

The bundled output (`dist/handler.js`) is ready for deployment to AWS Lambda via SAM or other infrastructure tools.

# EventForge Ingest API

Lambda function for ingesting events via API Gateway and publishing them to SQS.

## Overview

This service provides a REST API endpoint that:
- Accepts POST requests with event data
- Validates the incoming payload
- Enriches events with metadata (ID, timestamp, request ID)
- Publishes events to an SQS queue for asynchronous processing
- Returns immediate acknowledgment (202 Accepted)

## Prerequisites

- Node.js 20+
- npm or yarn
- AWS SAM CLI (for deployment)
- AWS credentials configured

## Local Development

### Install Dependencies

```bash
npm install
```

### Build

The build process uses esbuild to bundle the TypeScript code into a single JavaScript file optimized for AWS Lambda.

```bash
npm run build
```

This will:
- Clean the `dist/` directory
- Bundle `src/handler.ts` and dependencies
- Output to `dist/handler.js` with sourcemaps
- Target Node.js 20 runtime

### Run Tests

```bash
npm test
```

Note: Tests are currently a placeholder. Add proper test coverage using Jest or similar framework.

### Local Testing with SAM

```bash
# Start local API Gateway and Lambda
sam local start-api

# Invoke function locally with test event
sam local invoke IngestFunction -e events/test-event.json
```

## Environment Variables

The Lambda function requires the following environment variables:

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `EVENT_QUEUE_URL` | SQS queue URL where events are published | Yes | `https://sqs.us-east-1.amazonaws.com/123456789/eventforge-queue` |

## API Contract

### Endpoint

```
POST /events
```

### Request

**Headers:**
- `Content-Type: application/json`

**Body:**
```json
{
  "type": "user.signup",
  "data": {
    "userId": "12345",
    "email": "user@example.com",
    "timestamp": "2026-01-09T10:00:00Z"
  }
}
```

**Required Fields:**
- `type` (string): Event type identifier
- `data` (any): Event payload data

### Response

**Success (202 Accepted):**
```json
{
  "accepted": true,
  "event": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "type": "user.signup",
    "timestamp": "2026-01-09T10:00:00.123Z"
  },
  "messageId": "abcd1234-5678-90ef-ghij-klmnopqrstuv"
}
```

**Error (400 Bad Request):**
```json
{
  "error": "Field \"type\" is required and must be a string"
}
```

**Error (500 Internal Server Error):**
```json
{
  "error": "Failed to process event"
}
```

## Event Structure

Events published to SQS have the following structure:

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "type": "user.signup",
  "timestamp": "2026-01-09T10:00:00.123Z",
  "data": {
    "userId": "12345",
    "email": "user@example.com"
  },
  "requestId": "api-gateway-request-id"
}
```

## Deployment

### Using AWS SAM

1. Create `template.yaml` in the service root
2. Build and package:

```bash
sam build
sam package --output-template-file packaged.yaml --s3-bucket your-deployment-bucket
```

3. Deploy:

```bash
sam deploy --template-file packaged.yaml --stack-name eventforge-ingest --capabilities CAPABILITY_IAM
```

### Environment Configuration

Set the `EVENT_QUEUE_URL` in your SAM template or Lambda configuration:

```yaml
Environment:
  Variables:
    EVENT_QUEUE_URL: !GetAtt EventQueue.QueueUrl
```

## Project Structure

```
services/ingest-api/
├── src/
│   └── handler.ts          # Lambda function handler
├── dist/                   # Build output (generated)
│   └── handler.js
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── README.md               # This file
```

## Error Handling

The function handles the following error cases:

1. **Missing body**: Returns 400 with clear error message
2. **Invalid JSON**: Returns 400 with parse error
3. **Missing required fields**: Returns 400 with validation error
4. **SQS publish failure**: Returns 500, logs error for debugging
5. **Missing ENV variables**: Returns 500, logs configuration error

## Logging

All logs are written to CloudWatch Logs. Key log events:

- Incoming API Gateway event (full request)
- Built event payload before SQS publish
- SQS message ID on success
- Errors with stack traces

## Performance

- Cold start: ~500-800ms
- Warm invocation: ~50-100ms
- Target timeout: 15 seconds
- Recommended memory: 256 MB

## Security

- No AWS credentials in code (uses IAM role)
- Input validation on all fields
- Secrets should be stored in AWS Secrets Manager
- API Gateway should use API keys or OAuth for authentication

## Future Enhancements

- [ ] Add unit and integration tests
- [ ] Implement request schema validation with JSON Schema
- [ ] Add retry logic with exponential backoff
- [ ] Implement idempotency key support
- [ ] Add CloudWatch custom metrics
- [ ] Add AWS X-Ray tracing

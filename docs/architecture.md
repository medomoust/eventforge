# EventForge Architecture

## System Overview

EventForge is designed as a serverless, event-driven architecture leveraging AWS managed services for scalability, reliability, and cost efficiency.

## Data Flow

### Ingestion Flow

```
1. Client sends POST request with event payload
   ↓
2. API Gateway receives and validates request
   ↓
3. Ingest Lambda function:
   - Validates event schema
   - Adds metadata (timestamp, request ID)
   - Publishes message to SQS
   - Returns 202 Accepted response
   ↓
4. SQS Queue:
   - Buffers messages
   - Decouples ingestion from processing
   - Provides durability and retry mechanism
   ↓
5. Processor Lambda (triggered by SQS):
   - Receives batch of messages
   - Processes and transforms events
   - Persists to DynamoDB
   - Deletes messages from queue on success
   ↓
6. DynamoDB:
   - Stores processed events
   - Indexed for efficient querying
   - Provides point-in-time recovery

7. Failed Messages → DLQ:
   - After max retry attempts
   - Available for analysis and manual replay
```

## Component Details

### API Gateway

- **Type**: REST API
- **Endpoint**: `/events` (POST)
- **Features**:
  - Request validation
  - Rate limiting and throttling
  - API key authentication
  - CloudWatch logging

### Ingest Lambda

- **Runtime**: Node.js 18
- **Memory**: 256 MB (configurable)
- **Timeout**: 15 seconds
- **Responsibilities**:
  - Input validation
  - Event enrichment (add timestamps, IDs)
  - SQS message publishing
  - Error handling and logging

### SQS Queue

- **Type**: Standard Queue
- **Visibility Timeout**: 30 seconds
- **Message Retention**: 4 days
- **Max Receive Count**: 3 (before sending to DLQ)
- **Benefits**:
  - Asynchronous processing
  - Load buffering during traffic spikes
  - Automatic scaling trigger for processor

### Processor Lambda (Phase 2)

- **Runtime**: Node.js 18
- **Batch Size**: 10 messages
- **Batch Window**: 5 seconds
- **Responsibilities**:
  - Event transformation and enrichment
  - Business logic application
  - DynamoDB persistence
  - Partial batch failure handling

### DynamoDB

- **Table**: `eventforge-events`
- **Partition Key**: `eventId` (UUID)
- **Sort Key**: `timestamp` (ISO 8601)
- **Features**:
  - On-demand billing mode
  - Point-in-time recovery enabled
  - TTL for automatic data expiration (optional)
  - GSIs for querying by event type, source, etc.

### Dead Letter Queue (DLQ)

- **Type**: SQS Queue
- **Purpose**: Capture failed messages after max retries
- **Monitoring**: CloudWatch alarms on queue depth
- **Process**: Manual investigation and replay mechanism

## Reliability/Idempotency Plan

### Idempotency Strategy

**Problem**: Duplicate event processing can occur due to retries, at-least-once delivery semantics, or client retries.

**Solution**:

1. **Client-Provided Idempotency Keys**
   - Clients include `idempotencyKey` in event payload
   - Lambda checks DynamoDB for existing event with same key
   - If exists, return success without reprocessing

2. **Event ID Generation**
   - Generate deterministic event IDs using hash of key fields
   - Store in DynamoDB with conditional write
   - Fail gracefully on duplicate key violations

3. **SQS Message Deduplication**
   - Use FIFO queue option for strict ordering (if required)
   - Set deduplication interval (5 minutes)
   - Content-based deduplication using message body hash

### Reliability Measures

#### Retry Strategy

- **SQS Retry**: Automatic with exponential backoff
  - Attempt 1: Immediate
  - Attempt 2: After 1 minute
  - Attempt 3: After 5 minutes
  - After 3 attempts → DLQ

- **Lambda Error Handling**: Partial batch failure
  - Successfully processed messages are deleted
  - Failed messages remain in queue for retry
  - Prevents entire batch from being reprocessed

#### Error Handling

1. **Validation Errors**: Return 400 Bad Request immediately
2. **Transient Errors**: Allow automatic retry via SQS
3. **Persistent Errors**: Send to DLQ for investigation
4. **Partial Failures**: Use Lambda batch response to selectively retry

#### Monitoring & Alerting

- **CloudWatch Metrics**:
  - API Gateway 4xx/5xx errors
  - Lambda invocation errors and throttles
  - SQS queue depth and age of oldest message
  - DLQ message count
  - DynamoDB write throttles

- **CloudWatch Alarms**:
  - DLQ depth > 0 (critical)
  - Lambda error rate > 5% (warning)
  - SQS oldest message age > 1 hour (warning)
  - API Gateway latency p99 > 1s (warning)

#### Data Durability

- **SQS**: Messages persisted across multiple AZs
- **DynamoDB**: Automatic replication across 3 AZs
- **Point-in-Time Recovery**: Enabled for DynamoDB (35-day retention)
- **Backup Strategy**: Daily snapshots to S3 (future enhancement)

#### Disaster Recovery

- **RTO (Recovery Time Objective)**: < 1 hour
- **RPO (Recovery Point Objective)**: < 15 minutes
- **Strategy**:
  - Infrastructure as Code for rapid rebuild
  - DynamoDB PITR for data recovery
  - DLQ replay mechanism for lost events
  - Multi-region deployment (Phase 4 enhancement)

### Observability

- **Structured Logging**: JSON logs with correlation IDs
- **Distributed Tracing**: AWS X-Ray integration
- **Metrics**: Custom CloudWatch metrics for business KPIs
- **Dashboard**: Real-time monitoring (Phase 3)

## Security Considerations

- **API Gateway**: API key authentication, TLS 1.2+
- **Lambda**: IAM roles with least privilege
- **SQS**: Encryption at rest (SSE) and in transit
- **DynamoDB**: Encryption at rest using AWS KMS
- **Secrets**: Stored in AWS Secrets Manager (no credentials in code)
- **Network**: VPC endpoints for internal AWS service communication (optional)

## Scalability

- **API Gateway**: Automatic scaling to 10,000 requests/second
- **Lambda**: Concurrent execution limit (default 1000, can increase)
- **SQS**: Unlimited throughput
- **DynamoDB**: On-demand scaling for unpredictable traffic

## Future Enhancements

- Stream processing using DynamoDB Streams + Lambda
- Real-time analytics using Kinesis Data Analytics
- Multi-region active-active deployment
- Event replay and time-travel debugging capabilities

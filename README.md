# EventForge

## Project Summary

EventForge is a scalable, serverless event ingestion and processing system built on AWS. It provides a robust pipeline for receiving, queuing, processing, and storing event data with built-in reliability and observability features.

## Architecture Overview

EventForge follows a modern serverless architecture pattern:

```
Client → API Gateway → Lambda (Ingest) → SQS → Lambda (Processor) → DynamoDB
                                          ↓
                                         DLQ (Dead Letter Queue)
```

**Key Components:**

- **API Gateway**: REST API endpoint for receiving events
- **Ingest Lambda**: Validates and publishes events to SQS
- **SQS Queue**: Decouples ingestion from processing, provides buffering
- **Processor Lambda**: Processes events and persists to DynamoDB
- **DynamoDB**: NoSQL database for event storage
- **DLQ**: Handles failed messages for investigation and replay

For detailed architecture information, see [docs/architecture.md](docs/architecture.md).

## Idempotency Proof

EventForge guarantees that sending the same event `id` multiple times results in exactly one DynamoDB record. The processor Lambda uses conditional writes (`attribute_not_exists(pk) AND attribute_not_exists(sk)`) to prevent duplicate entries.

**Example Test:**

Send the same event twice with `id: "idem-test-001"`:

```bash
# First request
curl -X POST "https://<your-api-id>.execute-api.<region>.amazonaws.com/Prod/events" \
  -H "Content-Type: application/json" \
  -d '{"id":"idem-test-001","type":"idempotency-test","data":{"try":1}}'

# Second request (same id)
curl -X POST "https://<your-api-id>.execute-api.<region>.amazonaws.com/Prod/events" \
  -H "Content-Type: application/json" \
  -d '{"id":"idem-test-001","type":"idempotency-test","data":{"try":2}}'
```

**Verify only one record exists:**

```bash
aws dynamodb query \
  --table-name "eventforge-event-store" \
  --key-condition-expression "pk = :pk" \
  --expression-attribute-values '{":pk":{"S":"EVENT#idem-test-001"}}' \
  --query "Count" --output text
```

Expected output: `1` (only one record, even though we sent the event twice)

The processor logs duplicate attempts as warnings without throwing errors, ensuring graceful handling of retries.

## Observability

EventForge includes comprehensive monitoring through CloudWatch dashboards, alarms, and structured JSON logging.

### CloudWatch Dashboard

Access the monitoring dashboard:

```bash
# Get the dashboard URL from stack outputs
aws cloudformation describe-stacks \
  --stack-name <your-stack-name> \
  --query "Stacks[0].Outputs[?OutputKey=='DashboardUrl'].OutputValue" \
  --output text
```

Or navigate to: **CloudWatch → Dashboards → eventforge-monitoring**

The dashboard displays:
- API Gateway request errors, count, and latency
- Lambda function metrics (invocations, errors, throttles, duration p95)
- SQS queue depth and message age for both EventQueue and DLQ

### CloudWatch Alarms

Four production-ready alarms monitor system health:

| Alarm | Triggers When | What It Means |
|-------|---------------|---------------|
| **DLQ Messages** | ≥1 message in DLQ | Events failed processing after 3 retries - investigate DLQ |
| **Queue Age** | Messages older than 60s for 2 min | Processing backlog - check Lambda concurrency/DynamoDB |
| **Processor Errors** | ≥1 Lambda error | ProcessorFunction failures - check logs for errors |
| **API 5XX Errors** | ≥1 API Gateway 5XX | IngestFunction or SQS issues - check service health |

View alarms in: **CloudWatch → Alarms**

### Viewing Logs

All logs are structured JSON for easy parsing and searching.

**Tail logs in real-time:**

```bash
# IngestFunction logs
sam logs -n IngestFunction --stack-name <your-stack-name> --tail

# ProcessorFunction logs
sam logs -n ProcessorFunction --stack-name <your-stack-name> --tail
```

**Search logs in CloudWatch Insights:**

```sql
# Find errors across both functions
fields @timestamp, level, service, message, eventId, requestId
| filter level = "ERROR"
| sort @timestamp desc
| limit 100
```

**Log Structure:**

Each log entry includes:
- `level`: INFO | WARN | ERROR
- `service`: ingest-api | processor
- `message`: Human-readable description
- `eventId`: Event identifier (when available)
- `requestId`: Request correlation ID (when available)
- `sqsMessageId`: SQS message ID (processor only)
- `timestamp`: ISO 8601 timestamp
- `meta`: Additional context

## Local Development

### Prerequisites

- Node.js 18+ and npm
- AWS CLI configured with appropriate credentials
- AWS SAM CLI or Terraform (depending on deployment method)

### Build

```bash
# Install dependencies for ingest API
cd services/ingest-api
npm install

# Run tests
npm test

# Build the Lambda function
npm run build
```

### Deploy

```bash
# Deploy using AWS SAM (Phase 1)
cd services/ingest-api
sam build
sam deploy --guided

# Or deploy using Terraform (Phase 4)
cd infra
terraform init
terraform plan
terraform apply
```

## Roadmap

See [docs/roadmap.md](docs/roadmap.md) for detailed phases.

- [x] **Phase 1**: Core ingest API (API Gateway + Lambda + SQS)
- [ ] **Phase 2**: Event processor and DynamoDB persistence
- [ ] **Phase 3**: Monitoring dashboard and observability
- [ ] **Phase 4**: Terraform infrastructure hardening

## Project Structure

```
eventforge/
├── services/
│   └── ingest-api/       # Event ingestion service
│       └── src/          # Lambda function source code
├── infra/                # Infrastructure as Code (Terraform)
├── docs/                 # Documentation
├── dashboard/            # Monitoring dashboard (Phase 3)
└── .github/workflows/    # CI/CD pipelines
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

MIT

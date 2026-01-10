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

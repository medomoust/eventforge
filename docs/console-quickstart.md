# EventForge Console Quick Start

This guide will help you get the EventForge Console up and running in minutes.

## Prerequisites

- Node.js 20 or higher
- npm or yarn
- A deployed EventForge backend (with API Gateway URL)

## Step 1: Install Dependencies

```bash
cd apps/console
npm install
```

## Step 2: Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

### Populate Environment Variables from CloudFormation Outputs

Replace `<your-stack-name>` with your actual stack name (e.g., `eventforge-dev`):

**Get API URL (required):**
```bash
STACK_NAME=<your-stack-name>

# Get API URL
aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`EventApiUrl`].OutputValue' \
  --output text

# Get CloudWatch Dashboard URL
aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`DashboardUrl`].OutputValue' \
  --output text

# Get SQS Queue URL
aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`QueueUrl`].OutputValue' \
  --output text

# Get SQS Dead Letter Queue URL
aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`DLQUrl`].OutputValue' \
  --output text

# Get DynamoDB Table Name
aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`EventTableName`].OutputValue' \
  --output text
```

**Or get all at once and create .env automatically:**

```bash
STACK_NAME=<your-stack-name>

cat > apps/console/.env <<EOF
VITE_EVENTFORGE_API_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`EventApiUrl`].OutputValue' --output text)
VITE_CLOUDWATCH_DASHBOARD_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`DashboardUrl`].OutputValue' --output text)
VITE_SQS_QUEUE_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`QueueUrl`].OutputValue' --output text)
VITE_SQS_DLQ_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`DLQUrl`].OutputValue' --output text)
VITE_DDB_TABLE_NAME=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`EventTableName`].OutputValue' --output text)
EOF

echo ".env file created successfully!"
```

Edit `.env` to verify all values are populated correctly.

## Step 3: Start Development Server

```bash
npm run dev
```

The console will open at [http://localhost:3000](http://localhost:3000)

## Step 4: Send Your First Event

1. Navigate to the **Overview** page (default)
2. Enter an event type (e.g., `user.signup`)
3. Optionally edit the JSON data
4. Click **Send Event**
5. View the response and see the event appear in the "Recent Events" list

## Features Overview

### Overview Page
- Quick event composer
- Last 10 events preview
- System health status

### Events Page
- Full event composer with custom ID support (for idempotency)
- Response panel showing server acknowledgment
- Recent events table with search and filtering
- Event details modal

### Operations Page
- Links to CloudWatch Dashboard, SQS Queues, DynamoDB Table
- Copy resource URLs to clipboard
- Run automated diagnostics (POST /events, idempotency checks)

### Settings Page
- View environment configuration
- Clear local storage (cached events)
- About and version information

## Troubleshooting

### "No API URL" warning

The header shows a yellow indicator if `VITE_EVENTFORGE_API_URL` is not set. Check your `.env` file and restart the dev server.

### CORS Errors

If you see CORS errors when sending events:

1. Verify your API Gateway has CORS enabled
2. Check that your console's origin is allowed in the CORS configuration
3. Look for preflight OPTIONS requests in browser DevTools

Example CORS config in SAM template:

```yaml
Cors:
  AllowOrigin: "'http://localhost:3000'"
  AllowMethods: "'GET,POST,OPTIONS'"
  AllowHeaders: "'Content-Type'"
```

### Events Not Appearing in Recent List

The backend `GET /events/recent` endpoint isn't implemented yet, so the console uses localStorage as a fallback. Events you send through the console are cached locally and will appear in the recent events list.

## Production Build

Build the optimized production bundle:

```bash
npm run build
```

The output will be in the `dist/` folder. Deploy this to:
- AWS S3 + CloudFront
- Netlify
- Vercel
- Any static hosting service

## Next Steps

- Explore the **Events** page to compose complex events
- Run diagnostics in the **Operations** page
- Check the Settings page to verify all environment variables are configured
- Customize the UI by editing components in `src/components/`

## Getting Help

- Console documentation: [apps/console/README.md](../../apps/console/README.md)
- Architecture documentation: [docs/architecture.md](./architecture.md)
- EventForge main README: [README.md](../README.md)

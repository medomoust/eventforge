# EventForge Deployment Guide - GET /events/recent

This guide walks through deploying the new `GET /events/recent` endpoint to AWS.

## What's New

The following changes implement a real read endpoint for recent events:

### Infrastructure (infra/template.yaml)
- ✅ Added GSI1 (Global Secondary Index) to EventStore table
  - Partition key: `gsi1pk` (S)
  - Sort key: `gsi1sk` (S)
  - Projection: ALL
- ✅ Added `EVENT_TABLE_NAME` environment variable to IngestFunction
- ✅ Added `DynamoDBReadPolicy` to IngestFunction
- ✅ Added `IngestApiGetRecent` event for `GET /events/recent`

### Backend Services

**services/processor/src/handler.ts**
- ✅ Added `gsi1pk: 'RECENT'` to all DynamoDB items
- ✅ Added `gsi1sk: event.timestamp` to all DynamoDB items

**services/ingest-api/src/handler.ts**
- ✅ Imported `DynamoDB.DocumentClient` from aws-sdk
- ✅ Added `TABLE_NAME` environment variable
- ✅ Implemented `handleGetRecentEvents()` function
- ✅ Added route detection in main handler
- ✅ Query GSI1 with optional type filtering
- ✅ CORS headers on all responses

### Frontend Console

**apps/console/**
- ✅ Updated `RecentEventsResponse` type to use `items` array
- ✅ Simplified `getRecentEvents()` API client
- ✅ Updated `useRecentEvents` hook to return `isLive` indicator
- ✅ Added Live/Local cache badge in Overview page
- ✅ Updated Operations diagnostics to test GET endpoint
- ✅ Updated documentation with API examples

## Pre-Deployment Checklist

✅ SAM template validation passed
✅ IngestFunction TypeScript compiled successfully
✅ ProcessorFunction TypeScript compiled successfully
✅ Console TypeScript type checking passed
✅ All documentation updated

## Deployment Steps

### 1. Build Lambda Functions

```bash
# Build ingest-api
cd services/ingest-api
npm install
npm run build

# Build processor
cd ../processor
npm install
npm run build
```

### 2. Build SAM Application

```bash
cd ../../infra
sam build --template-file template.yaml
```

Expected output:
```
Building codeuri: /path/to/services/ingest-api runtime: nodejs20.x...
Building codeuri: /path/to/services/processor runtime: nodejs20.x...
Build Succeeded
```

### 3. Deploy to AWS

```bash
# First time deployment (interactive)
sam deploy --guided

# Subsequent deployments
sam deploy
```

**Important Notes:**
- DynamoDB GSI creation takes 5-10 minutes
- Existing items won't have `gsi1pk`/`gsi1sk` attributes (only new events will appear in queries)
- API Gateway changes are immediate

### 4. Get API Endpoint URL

```bash
aws cloudformation describe-stacks \
  --stack-name <your-stack-name> \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text
```

## Validation Commands

### Test POST /events (existing functionality)

```bash
API_URL="https://<api-id>.execute-api.<region>.amazonaws.com/Prod"

curl -X POST "$API_URL/events" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test.deployment",
    "data": {"source": "deployment-validation"}
  }'
```

Expected response (202 Accepted):
```json
{
  "accepted": true,
  "event": {
    "id": "generated-uuid",
    "type": "test.deployment",
    "timestamp": "2026-01-10T..."
  },
  "messageId": "sqs-message-id"
}
```

### Test GET /events/recent (new functionality)

Wait 5-10 seconds for processing, then:

```bash
# Get recent events
curl "$API_URL/events/recent?limit=10" | jq

# Filter by type
curl "$API_URL/events/recent?type=test.deployment&limit=5" | jq
```

Expected response (200 OK):
```json
{
  "items": [
    {
      "id": "...",
      "type": "test.deployment",
      "timestamp": "2026-01-10T...",
      "data": {"source": "deployment-validation"},
      "requestId": "..."
    }
  ],
  "count": 1
}
```

### Verify CORS Headers

```bash
curl -i -X OPTIONS "$API_URL/events/recent" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET"
```

Expected headers:
```
access-control-allow-origin: http://localhost:3000
access-control-allow-methods: OPTIONS,POST,GET
access-control-allow-headers: content-type,authorization,...
```

### Check GSI Status

```bash
aws dynamodb describe-table \
  --table-name eventforge-event-store \
  --query "Table.GlobalSecondaryIndexes[0].IndexStatus" \
  --output text
```

Expected: `ACTIVE` (may be `CREATING` for 5-10 minutes after first deploy)

## Console Update

After deployment, update the console environment:

```bash
cd apps/console

# Update .env or .env.local
echo "VITE_EVENTFORGE_API_URL=$API_URL" >> .env.local

# Restart dev server
npm run dev
```

Navigate to Overview page and verify:
- Recent Events section shows "Live" badge (green with WiFi icon)
- Events appear within 30 seconds of sending
- Operations diagnostics shows "GET /events/recent" success

## Troubleshooting

### GET returns 404

**Cause**: API Gateway route not created
**Fix**: Verify `sam deploy` completed successfully, check API Gateway console

### GET returns empty items array

**Causes**:
1. GSI still creating (5-10 min wait)
2. No events sent since deployment (old events don't have GSI attributes)

**Fix**: Send a new test event via POST, wait 5-10 seconds, then GET

### GET returns 500

**Cause**: Lambda doesn't have DynamoDB read permissions or table name is wrong
**Fix**: Check CloudWatch logs for IngestFunction, verify IAM policy and env vars

### Console shows "Local cache" instead of "Live"

**Causes**:
1. CORS issue (check browser console for errors)
2. Wrong API URL in `.env.local`
3. Backend not deployed yet

**Fix**: Verify CORS headers, check API URL, redeploy if needed

## Rollback

If issues occur, rollback to previous stack:

```bash
aws cloudformation delete-stack --stack-name <stack-name>
# Then redeploy previous version
```

Or update GSI only (safer):

```bash
# Remove GSI from template.yaml
# sam build && sam deploy
```

## Performance & Cost Notes

**GSI Storage Cost:**
- GSI duplicates all item attributes (Projection: ALL)
- ~2x storage cost for EventStore table
- Acceptable for portfolio/demo, consider KEYS_ONLY projection for production

**Query Performance:**
- Recent events query: Single partition scan with descending sort
- Type filter: Applied after query (less efficient, but acceptable for demo)
- Latency: ~50-200ms typical

**Recommendations for Production:**
- Use separate GSI per event type if filtering is frequent
- Consider KEYS_ONLY projection + GetItem batch for cost optimization
- Implement pagination with nextToken for large result sets
- Add caching layer (ElastiCache/CloudFront) for frequently accessed queries

## Next Steps

1. ✅ Deploy changes to dev environment
2. ⬜ Send test events and verify GET returns them
3. ⬜ Test console integration (Live badge, real data)
4. ⬜ Run Operations diagnostics suite
5. ⬜ Monitor CloudWatch logs for errors
6. ⬜ (Optional) Deploy to prod environment


# Deploying EventForge Console to AWS S3 + CloudFront

This guide walks through deploying the EventForge Console as a static website hosted on AWS S3 with CloudFront CDN.

## Prerequisites

- AWS CLI configured with appropriate credentials
- Node.js 20+ and npm installed
- EventForge backend already deployed (API Gateway URL available)

## Step 1: Configure Production Environment

Create a `.env.production` file in `apps/console/`:

```env
VITE_EVENTFORGE_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/Prod
VITE_CLOUDWATCH_DASHBOARD_URL=https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=your-stack-monitoring
VITE_SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/your-queue
VITE_SQS_DLQ_URL=https://sqs.us-east-1.amazonaws.com/123456789012/your-dlq
VITE_DDB_TABLE_NAME=your-table-name
```

## Step 2: Build Production Bundle

```bash
cd apps/console
npm run build
```

This creates an optimized production build in the `dist/` directory.

## Step 3: Create S3 Bucket

```bash
# Create bucket (replace with your unique name)
aws s3 mb s3://eventforge-console

# Enable static website hosting
aws s3 website s3://eventforge-console \
  --index-document index.html \
  --error-document index.html
```

Note: We set `error-document` to `index.html` to support client-side routing with React Router.

## Step 4: Configure Bucket Policy for Public Access

Create a file `bucket-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::eventforge-console/*"
    }
  ]
}
```

Apply the policy:

```bash
aws s3api put-bucket-policy \
  --bucket eventforge-console \
  --policy file://bucket-policy.json
```

## Step 5: Upload Build Files

```bash
aws s3 sync dist/ s3://eventforge-console --delete
```

The `--delete` flag removes files from S3 that aren't in your local `dist/` folder.

## Step 6: Test S3 Website

Your console is now available at:

```
http://eventforge-console.s3-website-us-east-1.amazonaws.com
```

## Step 7: (Optional) Set Up CloudFront

For HTTPS, custom domains, and better performance, create a CloudFront distribution:

```bash
aws cloudfront create-distribution \
  --origin-domain-name eventforge-console.s3-website-us-east-1.amazonaws.com \
  --default-root-object index.html
```

Or use the AWS Console:
1. Go to CloudFront → Create Distribution
2. Origin Domain: `eventforge-console.s3-website-us-east-1.amazonaws.com`
3. Viewer Protocol Policy: Redirect HTTP to HTTPS
4. Default Root Object: `index.html`
5. Custom Error Pages:
   - 403 → /index.html (for React Router)
   - 404 → /index.html (for React Router)

## Step 8: Update API Gateway CORS

Update your EventForge API Gateway CORS settings to allow the console domain:

```yaml
# In infra/template.yaml
Cors:
  AllowOrigin: "'https://d1234567890.cloudfront.net'"  # Your CloudFront domain
  AllowMethods: "'GET,POST,OPTIONS'"
  AllowHeaders: "'Content-Type,X-Amz-Date,Authorization,X-Api-Key'"
```

Redeploy the backend:

```bash
sam build
sam deploy
```

## Continuous Deployment Script

Create a `deploy.sh` script:

```bash
#!/bin/bash
set -e

echo "Building EventForge Console..."
cd apps/console
npm run build

echo "Uploading to S3..."
aws s3 sync dist/ s3://eventforge-console --delete

echo "Invalidating CloudFront cache..."
DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Origins.Items[0].DomainName=='eventforge-console.s3-website-us-east-1.amazonaws.com'].Id | [0]" \
  --output text)

if [ -n "$DIST_ID" ]; then
  aws cloudfront create-invalidation \
    --distribution-id $DIST_ID \
    --paths "/*"
  echo "Cache invalidation created for distribution: $DIST_ID"
fi

echo "Deployment complete!"
```

Make it executable:

```bash
chmod +x deploy.sh
```

Run deployments with:

```bash
./deploy.sh
```

## Alternative: Deploy to Netlify

For faster deployment without AWS configuration:

```bash
cd apps/console
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

Follow the prompts to link or create a new Netlify site.

## Troubleshooting

### React Router 404s

If you get 404 errors when navigating to routes directly, ensure:
- S3 website error document is set to `index.html`
- CloudFront has custom error responses configured (403/404 → /index.html)

### CORS Errors

- Verify API Gateway CORS configuration includes your console domain
- Check browser DevTools Network tab for preflight OPTIONS requests
- Ensure API Gateway responses include proper CORS headers

### Stale Cache

After updating the console, users may see old content due to CloudFront caching. Always invalidate the cache after deployments:

```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

## Security Best Practices

1. **Never commit `.env` files** with real credentials or URLs
2. Use environment-specific builds (`.env.production`, `.env.staging`)
3. Consider adding authentication (AWS Cognito, Auth0) for production
4. Set appropriate S3 bucket policies and CloudFront signed URLs if needed
5. Use HTTPS only (CloudFront enforces this)

---

For questions or issues, see the main [EventForge Console README](../../apps/console/README.md).

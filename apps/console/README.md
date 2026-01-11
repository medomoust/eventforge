# EventForge Console

A production-quality React + TypeScript operator console for the EventForge serverless event ingestion platform.

## Overview

EventForge Console is a modern, responsive web dashboard that provides:

- **Event Ingestion**: Send test events with full control over ID, type, and data
- **Event Browsing**: View recent events with search, filtering, and detailed inspection
- **Health Monitoring**: Real-time API health checks and system status
- **Operations Dashboard**: Quick access to AWS resources (CloudWatch, SQS, DynamoDB)
- **System Diagnostics**: Automated tests for connectivity, idempotency, and performance

## Features

### 🎯 Event Management
- Compose and send events with optional custom IDs for idempotency
- JSON validation with inline error messages
- Response panel showing server acknowledgment
- Browse up to 50 recent events with search and type filtering
- Event details modal with full metadata display

### 📊 Monitoring & Operations
- System health check with latency metrics
- CloudWatch dashboard integration
- AWS resource links (SQS queues, DynamoDB tables)
- Automated diagnostics suite testing:
  - POST /events endpoint
  - GET /events/recent endpoint
  - Idempotency verification

### 💾 Data Sources
- **Primary**: Backend `GET /events/recent` endpoint fetches real events from DynamoDB
- **Fallback**: Browser localStorage stores recently sent events if backend is unavailable
- Visual indicator shows whether data is "Live" (from backend) or "Local cache" (from browser)
- Clear local storage from Settings page when needed

### 🎨 UI/UX
- Clean, modern interface with shadcn/ui-inspired components
- Responsive design for mobile, tablet, and desktop
- Dark mode color scheme with accessible contrast
- Toast notifications for user feedback
- Keyboard-friendly navigation

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **TanStack Query** - Server state management and caching
- **React Router** - Client-side routing
- **Sonner** - Toast notifications
- **Lucide React** - Icon library
- **Zod** - Runtime validation (ready to use)

## Project Structure

```
apps/console/
├── src/
│   ├── components/
│   │   ├── ui/              # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Textarea.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Dialog.tsx
│   │   │   └── Label.tsx
│   │   └── Layout.tsx       # Main layout with sidebar navigation
│   ├── hooks/
│   │   ├── useIngestEvent.ts    # TanStack Query mutation
│   │   ├── useRecentEvents.ts   # TanStack Query query
│   │   └── useHealthCheck.ts    # Health monitoring
│   ├── lib/
│   │   ├── api.ts               # Generic API client
│   │   ├── eventforgeClient.ts  # EventForge-specific API functions
│   │   ├── localStorage.ts      # Local storage utilities
│   │   └── utils.ts             # Helper functions
│   ├── pages/
│   │   ├── Overview.tsx         # Dashboard with quick send form
│   │   ├── Events.tsx           # Full event composer + browser
│   │   ├── Operations.tsx       # AWS resources + diagnostics
│   │   └── Settings.tsx         # Configuration + about
│   ├── types/
│   │   └── index.ts             # TypeScript type definitions
│   ├── App.tsx                  # Router setup
│   ├── main.tsx                 # Entry point
│   └── index.css                # Tailwind + custom styles
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── .env.example                 # Environment variable template
├── .gitignore
└── README.md                    # This file
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

1. Navigate to the console directory:

```bash
cd apps/console
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

```bash
cp .env.example .env
```

Edit `.env` and set your EventForge API URL:

```env
VITE_EVENTFORGE_API_URL=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/Prod

# Optional (for operations view)
VITE_CLOUDWATCH_DASHBOARD_URL=https://console.aws.amazon.com/cloudwatch/...
VITE_SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/...
VITE_SQS_DLQ_URL=https://sqs.us-east-1.amazonaws.com/...
VITE_DDB_TABLE_NAME=YourStackName-EventStore-...
```

### Development

Run the development server:

```bash
npm run dev
```

The console will be available at [http://localhost:3000](http://localhost:3000)

### Building for Production

Build the optimized production bundle:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

### Type Checking

Run TypeScript type checking:

```bash
npm run typecheck
```

### Linting

Run ESLint:

```bash
npm run lint
```

## Environment Variables

All configuration is done through environment variables prefixed with `VITE_`:

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_EVENTFORGE_API_URL` | ✅ | EventForge API Gateway endpoint |
| `VITE_CLOUDWATCH_DASHBOARD_URL` | ❌ | CloudWatch Dashboard URL for monitoring |
| `VITE_SQS_QUEUE_URL` | ❌ | SQS Queue URL (for operations view) |
| `VITE_SQS_DLQ_URL` | ❌ | SQS Dead Letter Queue URL |
| `VITE_DDB_TABLE_NAME` | ❌ | DynamoDB EventStore table name |

## API Integration

### Ingest Endpoint (Implemented)

The console uses the existing EventForge ingest endpoint:

**POST** `/events`

Request body:
```json
{
  "id": "optional-custom-id",
  "type": "event.type",
  "data": { "optional": "data" },
  "timestamp": "2026-01-10T12:00:00Z",
  "requestId": "optional-request-id"
}
```

Response:
```json
{
  "accepted": true,
  "event": {
    "id": "generated-or-provided-id",
    "type": "event.type",
    "timestamp": "2026-01-10T12:00:00.123Z"
  },
  "messageId": "sqs-message-id"
}
```

### Read Endpoint (Implemented)

The console calls the EventForge read endpoint:

**GET** `/events/recent?limit=50&type=optional-filter`

Query parameters:
- `limit` (optional): Number of events to return (default 25, max 100)
- `type` (optional): Filter events by type

Response:
```json
{
  "items": [
    {
      "id": "event-id",
      "type": "event.type",
      "timestamp": "2026-01-10T12:00:00Z",
      "data": {},
      "requestId": "req-id"
    }
  ],
  "count": 1,
  "nextToken": "optional-pagination-token"
}
```

**Backend Implementation:**
- Uses DynamoDB Global Secondary Index (GSI1) for efficient querying
- Returns newest events first
- Supports optional type filtering
- Includes CORS headers for browser requests

**Fallback Behavior:**
- If backend is unavailable, console falls back to localStorage
- Visual indicator shows "Live" vs "Local cache" status
- Recent events update automatically every 30 seconds

## Architecture Notes

### State Management

- **TanStack Query** handles all server state (events, health checks)
- React hooks encapsulate query and mutation logic
- Automatic refetching every 10 seconds for recent events
- Optimistic updates and cache invalidation on mutations

### Error Handling

- API client throws typed `ApiError` objects
- TanStack Query captures errors and exposes them via hooks
- Toast notifications provide user feedback
- Graceful degradation when optional endpoints (like GET /events/recent) aren't available

### Idempotency Support

- Event composer accepts optional custom IDs
- Same ID can be sent multiple times (backend enforces exactly-once persistence)
- Diagnostics suite verifies idempotency by sending duplicate events

### Local Storage Strategy

- Fallback for when backend read endpoint doesn't exist
- Stores last 50 events with metadata
- Can be cleared from Settings page
- Events tagged with `localOnly: true` flag

## Production Deployment

### Static Hosting

Build the app and deploy the `dist/` folder to any static host:

- AWS S3 + CloudFront
- Netlify
- Vercel
- GitHub Pages

Example S3 deployment:

```bash
npm run build
aws s3 sync dist/ s3://your-bucket-name --delete
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

### CORS Configuration

Ensure your EventForge API Gateway allows requests from your console domain:

```yaml
Cors:
  AllowMethods: "'GET,POST,OPTIONS'"
  AllowHeaders: "'Content-Type,X-Amz-Date,Authorization,X-Api-Key'"
  AllowOrigin: "'https://your-console-domain.com'"
```

## Troubleshooting

### "No API URL" warning in header

- Check that `VITE_EVENTFORGE_API_URL` is set in your `.env` file
- Restart the dev server after changing `.env`

### Events not appearing in recent events list

- The backend `GET /events/recent` endpoint may not be implemented yet
- Check browser localStorage: events you send are cached locally
- Verify the console isn't in an incognito/private window (localStorage disabled)

### CORS errors when sending events

- Ensure your API Gateway has CORS configured for your console's origin
- Check browser DevTools Network tab for preflight OPTIONS requests

### TypeScript errors

```bash
npm run typecheck
```

Check for missing type definitions or incorrect API response shapes.

## Future Enhancements

- [ ] Real-time event streaming with WebSocket or SSE
- [ ] Event replay functionality
- [ ] Batch event ingestion
- [ ] Advanced filtering (date range, custom fields)
- [ ] Export events to CSV/JSON
- [ ] User authentication and authorization
- [ ] Multi-environment support (dev, staging, prod)
- [ ] Dark/light mode toggle
- [ ] Performance metrics visualization

## Contributing

This console is part of the EventForge monorepo. Follow the repository's contribution guidelines.

## License

Part of the EventForge project. See root repository for license information.

---

**Built with ❤️ for EventForge**

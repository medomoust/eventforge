import { createApiClient } from './api';
import type {
  EventIngestRequest,
  EventIngestResponse,
  RecentEventsResponse,
} from '@/types';

const API_URL = import.meta.env.VITE_EVENTFORGE_API_URL || '';

if (!API_URL) {
  console.warn(
    'VITE_EVENTFORGE_API_URL is not set. Please configure it in your .env file.'
  );
}

const apiClient = createApiClient(API_URL);

/**
 * Ingest an event into EventForge
 */
export async function ingestEvent(
  payload: EventIngestRequest
): Promise<EventIngestResponse> {
  return apiClient.post<EventIngestResponse>('/events', payload);
}

/**
 * Get recent events from EventForge backend
 */
export async function getRecentEvents(limit = 50): Promise<RecentEventsResponse> {
  return apiClient.get<RecentEventsResponse>(`/events/recent?limit=${limit}`);
}

/**
 * Health check - sends a ping event to verify API connectivity
 */
export async function healthCheck(): Promise<{ healthy: boolean; latency: number }> {
  const start = Date.now();
  try {
    await ingestEvent({
      id: `ping-${Date.now()}`,
      type: 'system.healthcheck',
      data: { source: 'console' },
    });
    const latency = Date.now() - start;
    return { healthy: true, latency };
  } catch {
    return { healthy: false, latency: Date.now() - start };
  }
}

export const config = {
  apiUrl: API_URL,
  cloudWatchDashboardUrl: import.meta.env.VITE_CLOUDWATCH_DASHBOARD_URL || '',
  sqsQueueUrl: import.meta.env.VITE_SQS_QUEUE_URL || '',
  sqsDlqUrl: import.meta.env.VITE_SQS_DLQ_URL || '',
  dynamoDbTableName: import.meta.env.VITE_DDB_TABLE_NAME || '',
};

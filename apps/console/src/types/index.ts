export interface EventIngestRequest {
  id?: string;
  type: string;
  data?: Record<string, unknown>;
  timestamp?: string;
  requestId?: string;
}

export interface EventIngestResponse {
  accepted: boolean;
  event: {
    id: string;
    type: string;
    timestamp: string;
  };
  messageId: string;
}

export interface StoredEvent {
  id: string;
  type: string;
  timestamp: string;
  data?: Record<string, unknown>;
  requestId?: string;
  messageId?: string;
}

export interface RecentEventsResponse {
  items: StoredEvent[];
  count: number;
  nextToken?: string;
}

export interface DiagnosticsResult {
  test: string;
  status: 'success' | 'error';
  duration: number;
  message?: string;
  error?: string;
}

export interface StackOutputs {
  cloudWatchDashboardUrl?: string;
  sqsQueueUrl?: string;
  sqsDlqUrl?: string;
  dynamoDbTableName?: string;
}

export interface ApiError {
  message: string;
  status?: number;
}

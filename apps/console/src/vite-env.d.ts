/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_EVENTFORGE_API_URL: string;
  readonly VITE_CLOUDWATCH_DASHBOARD_URL: string;
  readonly VITE_SQS_QUEUE_URL: string;
  readonly VITE_SQS_DLQ_URL: string;
  readonly VITE_DDB_TABLE_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

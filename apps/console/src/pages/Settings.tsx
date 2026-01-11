import { Settings as SettingsIcon, Info, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { config } from '@/lib/eventforgeClient';
import { clearLocalEvents } from '@/lib/localStorage';

export default function Settings() {
  const handleClearLocalEvents = () => {
    if (confirm('Are you sure you want to clear all locally stored events?')) {
      clearLocalEvents();
      toast.success('Local events cleared');
      window.location.reload();
    }
  };

  // Helper to generate DynamoDB console URL
  const getDynamoDbUrl = (tableName: string) => {
    // Extract region from API URL or default to us-east-1
    const region = config.apiUrl.match(/\.([a-z]{2}-[a-z]+-\d)\.amazonaws/)?.[1] || 'us-east-1';
    return `https://console.aws.amazon.com/dynamodbv2/home?region=${region}#table?name=${tableName}`;
  };

  const envVars = [
    {
      name: 'VITE_EVENTFORGE_API_URL',
      value: config.apiUrl,
      required: true,
      description: 'EventForge API Gateway endpoint',
      type: 'text' as const,
    },
    {
      name: 'VITE_CLOUDWATCH_DASHBOARD_URL',
      value: config.cloudWatchDashboardUrl,
      required: false,
      description: 'CloudWatch Dashboard URL for monitoring',
      type: 'link' as const,
    },
    {
      name: 'VITE_SQS_QUEUE_URL',
      value: config.sqsQueueUrl,
      required: false,
      description: 'SQS Queue URL for operations view',
      type: 'link' as const,
    },
    {
      name: 'VITE_SQS_DLQ_URL',
      value: config.sqsDlqUrl,
      required: false,
      description: 'SQS Dead Letter Queue URL',
      type: 'link' as const,
    },
    {
      name: 'VITE_DDB_TABLE_NAME',
      value: config.dynamoDbTableName,
      required: false,
      description: 'DynamoDB EventStore table name',
      type: 'dynamodb' as const,
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure environment variables and manage application data
        </p>
      </div>

      {/* Environment Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Environment Configuration
          </CardTitle>
          <CardDescription>
            Set these variables in your .env file and restart the dev server
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {envVars.map((envVar) => (
              <div key={envVar.name} className="p-4 border border-border rounded-md">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-sm font-mono">{envVar.name}</code>
                      {envVar.required && (
                        <Badge variant="destructive" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{envVar.description}</p>
                  </div>
                  {envVar.value ? (
                    <Badge variant="success" className="flex-shrink-0">
                      Set
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="flex-shrink-0">
                      Not Set
                    </Badge>
                  )}
                </div>
                {envVar.value && (
                  <>
                    <div className="mt-2 p-2 bg-accent rounded text-xs font-mono break-all">
                      {envVar.value}
                    </div>
                    {envVar.type === 'link' && (
                      <a
                        href={envVar.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-sm text-primary hover:underline"
                      >
                        Open in AWS Console
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {envVar.type === 'dynamodb' && (
                      <a
                        href={getDynamoDbUrl(envVar.value)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-sm text-primary hover:underline"
                      >
                        View Table in DynamoDB Console
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-muted rounded-md">
            <p className="text-sm font-medium mb-2">How to configure:</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Copy .env.example to .env in the console directory</li>
              <li>Fill in your EventForge API URL and optional resource URLs</li>
              <li>Restart the dev server: npm run dev</li>
              <li>Get values from CloudFormation outputs (see docs/console-quickstart.md)</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Local Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Local Data Management
          </CardTitle>
          <CardDescription>
            Manage locally stored events (fallback when backend read endpoint is unavailable)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border border-border rounded-md">
              <p className="text-sm text-muted-foreground mb-4">
                Events sent through this console are stored locally in your browser's localStorage.
                This allows you to view recent events even when the backend GET endpoint isn't
                implemented yet.
              </p>
              <Button variant="destructive" onClick={handleClearLocalEvents}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Local Events
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            About EventForge Console
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">EventForge Console</strong> is a production-quality
              operator dashboard for the EventForge event ingestion platform.
            </p>
            <div>
              <p className="font-medium text-foreground mb-1">Features:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Send test events with optional custom IDs (idempotency support)</li>
                <li>Browse recent event history with search and filtering</li>
                <li>System health monitoring and diagnostics</li>
                <li>Quick access to AWS operational resources</li>
                <li>Responsive design for mobile and desktop</li>
              </ul>
            </div>
            <div className="pt-3 border-t border-border">
              <p className="font-medium text-foreground">Tech Stack:</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="secondary">React 18</Badge>
                <Badge variant="secondary">TypeScript</Badge>
                <Badge variant="secondary">Vite</Badge>
                <Badge variant="secondary">Tailwind CSS</Badge>
                <Badge variant="secondary">TanStack Query</Badge>
                <Badge variant="secondary">React Router</Badge>
              </div>
            </div>
            <div className="pt-3 border-t border-border">
              <p className="text-xs">Version: 1.0.0</p>
              <p className="text-xs mt-1">© 2026 EventForge</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

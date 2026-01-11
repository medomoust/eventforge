import { useState } from 'react';
import { ExternalLink, Copy, CheckCircle2, PlayCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { config, ingestEvent, getRecentEvents } from '@/lib/eventforgeClient';
import { copyToClipboard } from '@/lib/utils';
import type { DiagnosticsResult } from '@/types';

export default function Operations() {
  const [diagnosticsRunning, setDiagnosticsRunning] = useState(false);
  const [diagnosticsResults, setDiagnosticsResults] = useState<DiagnosticsResult[]>([]);

  const handleCopy = async (text: string, label: string) => {
    try {
      await copyToClipboard(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const runDiagnostics = async () => {
    setDiagnosticsRunning(true);
    setDiagnosticsResults([]);
    const results: DiagnosticsResult[] = [];

    // Test 1: POST event
    try {
      const start = Date.now();
      await ingestEvent({
        id: `diag-${Date.now()}`,
        type: 'system.diagnostic',
        data: { test: 'connectivity' },
      });
      const duration = Date.now() - start;
      results.push({
        test: 'POST /events',
        status: 'success',
        duration,
        message: 'Event ingestion working',
      });
    } catch (error) {
      results.push({
        test: 'POST /events',
        status: 'error',
        duration: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test 2: GET recent events
    try {
      const start = Date.now();
      const response = await getRecentEvents(10);
      const duration = Date.now() - start;
      results.push({
        test: 'GET /events/recent',
        status: 'success',
        duration,
        message: `Returned ${response.items.length} events`,
      });
    } catch (error) {
      results.push({
        test: 'GET /events/recent',
        status: 'error',
        duration: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test 3: Idempotency check
    try {
      const testId = `idempotency-test-${Date.now()}`;
      const start = Date.now();
      
      await ingestEvent({
        id: testId,
        type: 'system.diagnostic.idempotency',
        data: { attempt: 1 },
      });
      
      await ingestEvent({
        id: testId,
        type: 'system.diagnostic.idempotency',
        data: { attempt: 2 },
      });
      
      const duration = Date.now() - start;
      results.push({
        test: 'Idempotency Check',
        status: 'success',
        duration,
        message: 'Same ID accepted twice (idempotent)',
      });
    } catch (error) {
      results.push({
        test: 'Idempotency Check',
        status: 'error',
        duration: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    setDiagnosticsResults(results);
    setDiagnosticsRunning(false);

    const successCount = results.filter((r) => r.status === 'success').length;
    if (successCount === results.length) {
      toast.success('All diagnostics passed');
    } else {
      toast.warning(`${successCount}/${results.length} diagnostics passed`);
    }
  };

  const resources = [
    {
      title: 'CloudWatch Dashboard',
      description: 'View metrics, logs, and alarms',
      url: config.cloudWatchDashboardUrl,
      configured: !!config.cloudWatchDashboardUrl,
    },
    {
      title: 'SQS Queue',
      description: 'EventForge main processing queue',
      value: config.sqsQueueUrl,
      configured: !!config.sqsQueueUrl,
    },
    {
      title: 'SQS Dead Letter Queue',
      description: 'Failed events for investigation',
      value: config.sqsDlqUrl,
      configured: !!config.sqsDlqUrl,
    },
    {
      title: 'DynamoDB Table',
      description: 'EventStore table name',
      value: config.dynamoDbTableName,
      configured: !!config.dynamoDbTableName,
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold">Operations</h1>
        <p className="text-muted-foreground mt-2">
          Access operational resources and run system diagnostics
        </p>
      </div>

      {/* AWS Resources */}
      <Card>
        <CardHeader>
          <CardTitle>AWS Resources</CardTitle>
          <CardDescription>Direct links and identifiers for EventForge infrastructure</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {resources.map((resource) => (
              <div
                key={resource.title}
                className="flex items-center justify-between p-4 border border-border rounded-md"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{resource.title}</h3>
                    {resource.configured ? (
                      <Badge variant="success" className="text-xs">
                        Configured
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Not Set
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{resource.description}</p>
                  {resource.configured && (
                    <p className="text-xs font-mono mt-2 text-muted-foreground truncate">
                      {'url' in resource ? resource.url : resource.value}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  {'url' in resource && resource.url ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(resource.url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(resource.url!, resource.title)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    'value' in resource &&
                    resource.value && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(resource.value!, resource.title)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Diagnostics */}
      <Card>
        <CardHeader>
          <CardTitle>System Diagnostics</CardTitle>
          <CardDescription>Run automated tests to verify system health</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button
              onClick={runDiagnostics}
              disabled={diagnosticsRunning}
              className="w-full md:w-auto"
            >
              {diagnosticsRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Diagnostics...
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Run Diagnostics
                </>
              )}
            </Button>

            {diagnosticsResults.length > 0 && (
              <div className="space-y-2 mt-4">
                {diagnosticsResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-md border ${
                      result.status === 'success'
                        ? 'border-green-500/50 bg-green-500/10'
                        : 'border-red-500/50 bg-red-500/10'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {result.status === 'success' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <ExternalLink className="h-4 w-4 text-red-500" />
                          )}
                          <span className="font-medium">{result.test}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {result.message || result.error}
                        </p>
                      </div>
                      <Badge
                        variant={result.status === 'success' ? 'success' : 'destructive'}
                        className="ml-2"
                      >
                        {result.duration}ms
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common operational tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <Button
              variant="outline"
              onClick={() => handleCopy(config.apiUrl, 'API URL')}
              disabled={!config.apiUrl}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy API URL
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                handleCopy(JSON.stringify(config, null, 2), 'Full Configuration')
              }
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Full Config
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

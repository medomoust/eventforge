import { useState } from 'react';
import { Zap, Clock, CheckCircle2, AlertCircle, TrendingUp, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { useIngestEvent } from '@/hooks/useIngestEvent';
import { useRecentEvents } from '@/hooks/useRecentEvents';
import { useHealthCheck } from '@/hooks/useHealthCheck';
import { formatRelativeTime } from '@/lib/utils';

export default function Overview() {
  const [eventType, setEventType] = useState('user.action');
  const [eventData, setEventData] = useState('{\n  "example": "data"\n}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const ingestMutation = useIngestEvent();
  const { events: recentEvents, isLive, isLoading: eventsLoading } = useRecentEvents({ limit: 10 });
  const { data: health } = useHealthCheck();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setJsonError(null);

    let parsedData = undefined;
    if (eventData.trim()) {
      try {
        parsedData = JSON.parse(eventData);
      } catch (err) {
        setJsonError('Invalid JSON');
        return;
      }
    }

    ingestMutation.mutate({
      type: eventType,
      data: parsedData,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold">Overview</h1>
        <p className="text-muted-foreground mt-2">
          Monitor your event ingestion system and send test events
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Status</CardTitle>
            {health?.healthy ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {health?.healthy ? 'Healthy' : 'Unavailable'}
            </div>
            <p className="text-xs text-muted-foreground">
              {health?.latency ? `${health.latency}ms latency` : 'Checking...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Events</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentEvents.length}</div>
            <p className="text-xs text-muted-foreground">
              {recentEvents.length > 0 ? 'In local storage' : 'No events yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingestion</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Ready</div>
            <p className="text-xs text-muted-foreground">Send events below</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Send Form */}
        <Card>
          <CardHeader>
            <CardTitle>Send Test Event</CardTitle>
            <CardDescription>Quickly ingest an event into the system</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="eventType">Event Type</Label>
                <Input
                  id="eventType"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  placeholder="e.g. user.signup"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventData">Event Data (JSON, optional)</Label>
                <Textarea
                  id="eventData"
                  value={eventData}
                  onChange={(e) => setEventData(e.target.value)}
                  placeholder='{"key": "value"}'
                  rows={6}
                  className="font-mono text-sm"
                />
                {jsonError && <p className="text-sm text-destructive">{jsonError}</p>}
              </div>
              <Button type="submit" disabled={ingestMutation.isPending} className="w-full">
                {ingestMutation.isPending ? 'Sending...' : 'Send Event'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent Events Preview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Events</CardTitle>
                <CardDescription>Last 10 events</CardDescription>
              </div>
              {isLive ? (
                <Badge variant="default" className="flex items-center gap-1">
                  <Wifi className="h-3 w-3" />
                  Live
                </Badge>
              ) : (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <WifiOff className="h-3 w-3" />
                  Local cache
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : recentEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No events yet</p>
                <p className="text-xs mt-1">Send your first event to get started</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-md border border-border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {event.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {event.id}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRelativeTime(event.timestamp)}
                      </p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-1" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

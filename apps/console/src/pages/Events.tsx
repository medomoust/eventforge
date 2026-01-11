import { useState } from 'react';
import { Search, X, FileJson } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/Dialog';
import { useIngestEvent } from '@/hooks/useIngestEvent';
import { useRecentEvents } from '@/hooks/useRecentEvents';
import { formatTimestamp } from '@/lib/utils';
import type { StoredEvent, EventIngestResponse } from '@/types';

export default function Events() {
  const [eventId, setEventId] = useState('');
  const [eventType, setEventType] = useState('user.action');
  const [eventData, setEventData] = useState('{\n  "example": "data"\n}');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<EventIngestResponse | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<StoredEvent | null>(null);

  const ingestMutation = useIngestEvent();
  const { data: recentEvents = [], isLoading } = useRecentEvents({ limit: 50 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJsonError(null);
    setLastResponse(null);

    let parsedData = undefined;
    if (eventData.trim()) {
      try {
        parsedData = JSON.parse(eventData);
      } catch (err) {
        setJsonError('Invalid JSON format');
        return;
      }
    }

    const result = await ingestMutation.mutateAsync({
      id: eventId || undefined,
      type: eventType,
      data: parsedData,
    });

    setLastResponse(result);
  };

  const handleClear = () => {
    setEventId('');
    setEventType('user.action');
    setEventData('{\n  "example": "data"\n}');
    setJsonError(null);
    setLastResponse(null);
  };

  // Filter events
  const filteredEvents = recentEvents.filter((event) => {
    const matchesSearch =
      event.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !typeFilter || event.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Get unique event types for filter
  const eventTypes = Array.from(new Set(recentEvents.map((e) => e.type)));

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold">Events</h1>
        <p className="text-muted-foreground mt-2">
          Send events and browse your recent event history
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Event Composer */}
        <Card>
          <CardHeader>
            <CardTitle>Event Composer</CardTitle>
            <CardDescription>Create and send events with full control</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="eventId">Event ID (optional)</Label>
                <Input
                  id="eventId"
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  placeholder="Leave empty for auto-generated UUID"
                />
                <p className="text-xs text-muted-foreground">
                  Provide your own ID for idempotent operations
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventType">Event Type *</Label>
                <Input
                  id="eventType"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  placeholder="e.g. user.signup, order.created"
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
                  rows={8}
                  className="font-mono text-sm"
                />
                {jsonError && <p className="text-sm text-destructive">{jsonError}</p>}
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={ingestMutation.isPending} className="flex-1">
                  {ingestMutation.isPending ? 'Sending...' : 'Send Event'}
                </Button>
                <Button type="button" variant="outline" onClick={handleClear}>
                  Clear
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Response Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Response</CardTitle>
            <CardDescription>Server response from last submission</CardDescription>
          </CardHeader>
          <CardContent>
            {lastResponse ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="success">Accepted</Badge>
                </div>
                <div className="space-y-3 p-4 bg-accent/50 rounded-md border border-border">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Event ID</p>
                    <p className="text-sm font-mono mt-1">{lastResponse.event.id}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Type</p>
                    <p className="text-sm font-mono mt-1">{lastResponse.event.type}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Timestamp</p>
                    <p className="text-sm font-mono mt-1">
                      {formatTimestamp(lastResponse.event.timestamp)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Message ID</p>
                    <p className="text-sm font-mono mt-1">{lastResponse.messageId}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileJson className="h-16 w-16 mb-4 opacity-50" />
                <p>No response yet</p>
                <p className="text-xs mt-1">Send an event to see the response</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
          <CardDescription>Browse and search your event history</CardDescription>
          <div className="flex gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {eventTypes.length > 0 && (
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Types</option>
                {eventTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            )}
            {(searchQuery || typeFilter) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setTypeFilter('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading events...</div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No events found</p>
              <p className="text-xs mt-1">
                {recentEvents.length === 0
                  ? 'Send your first event to populate this list'
                  : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <Badge variant="secondary">{event.type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{event.id}</TableCell>
                    <TableCell className="text-sm">{formatTimestamp(event.timestamp)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedEvent(event)}
                      >
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
            <DialogClose onClose={() => setSelectedEvent(null)} />
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <Label>Type</Label>
                <Badge variant="secondary" className="mt-1">
                  {selectedEvent.type}
                </Badge>
              </div>
              <div>
                <Label>Event ID</Label>
                <p className="text-sm font-mono mt-1 p-2 bg-accent rounded">{selectedEvent.id}</p>
              </div>
              <div>
                <Label>Timestamp</Label>
                <p className="text-sm mt-1">{formatTimestamp(selectedEvent.timestamp)}</p>
              </div>
              {selectedEvent.messageId && (
                <div>
                  <Label>Message ID</Label>
                  <p className="text-sm font-mono mt-1 p-2 bg-accent rounded">
                    {selectedEvent.messageId}
                  </p>
                </div>
              )}
              {selectedEvent.data && (
                <div>
                  <Label>Data</Label>
                  <pre className="text-xs font-mono mt-1 p-3 bg-accent rounded overflow-x-auto">
                    {JSON.stringify(selectedEvent.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

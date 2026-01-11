import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ingestEvent } from '@/lib/eventforgeClient';
import { saveLocalEvent } from '@/lib/localStorage';
import type { EventIngestRequest, EventIngestResponse, StoredEvent } from '@/types';

export function useIngestEvent() {
  const queryClient = useQueryClient();

  return useMutation<EventIngestResponse, Error, EventIngestRequest>({
    mutationFn: ingestEvent,
    onSuccess: (data, variables) => {
      const newEvent: StoredEvent = {
        id: data.event.id,
        type: data.event.type,
        timestamp: data.event.timestamp,
        messageId: data.messageId,
        data: variables.data,
        requestId: variables.requestId,
      };

      // Save to localStorage for persistence
      saveLocalEvent(newEvent);

      // Update React Query cache immediately for all limit variants
      queryClient.setQueriesData<{ events: StoredEvent[]; isLive: boolean }>(
        { queryKey: ['recentEvents'] },
        (oldData) => {
          const existingEvents = oldData?.events || [];
          // Add new event at the beginning, dedupe by id
          const filtered = existingEvents.filter((e) => e.id !== newEvent.id);
          const updatedEvents = [newEvent, ...filtered].slice(0, 50);
          
          return {
            events: updatedEvents,
            isLive: oldData?.isLive || false,
          };
        }
      );

      toast.success('Event ingested successfully', {
        description: `Event ID: ${data.event.id}`,
      });
    },
    onError: (error) => {
      toast.error('Failed to ingest event', {
        description: error.message,
      });
    },
  });
}

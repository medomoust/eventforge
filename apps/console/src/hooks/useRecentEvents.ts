import { useQuery } from '@tanstack/react-query';
import { getRecentEvents } from '@/lib/eventforgeClient';
import { getLocalEvents } from '@/lib/localStorage';
import type { StoredEvent } from '@/types';

interface UseRecentEventsOptions {
  limit?: number;
  refetchInterval?: number;
}

interface UseRecentEventsResult {
  events: StoredEvent[];
  isLive: boolean;
  isLoading: boolean;
  error: Error | null;
}

export function useRecentEvents(options: UseRecentEventsOptions = {}) {
  const { limit = 50, refetchInterval = 30000 } = options;

  const query = useQuery<{ events: StoredEvent[]; isLive: boolean }>({
    queryKey: ['recentEvents', limit],
    queryFn: async () => {
      // Try to get events from backend first
      try {
        const response = await getRecentEvents(limit);
        
        // Backend returns items array
        if (response.items && response.items.length >= 0) {
          return { events: response.items, isLive: true };
        }
      } catch (error) {
        // Gracefully handle backend errors (404, 403, network issues)
        console.info('Backend GET /events/recent not available, using localStorage');
      }

      // Fallback to localStorage
      const localEvents = getLocalEvents();
      return { events: localEvents.slice(0, limit), isLive: false };
    },
    refetchInterval,
    // Don't show error state, always return localStorage data
    retry: false,
  });

  return {
    events: query.data?.events || [],
    isLive: query.data?.isLive || false,
    isLoading: query.isLoading,
    error: query.error,
  };}
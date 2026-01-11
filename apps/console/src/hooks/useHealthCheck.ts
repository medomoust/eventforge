import { useQuery } from '@tanstack/react-query';
import { healthCheck } from '@/lib/eventforgeClient';

export function useHealthCheck() {
  return useQuery({
    queryKey: ['healthCheck'],
    queryFn: healthCheck,
    refetchInterval: 30000, // Check every 30 seconds
    retry: 1,
  });
}

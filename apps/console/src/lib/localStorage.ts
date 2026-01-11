import type { StoredEvent } from '@/types';

const STORAGE_KEY = 'eventforge_local_events';
const MAX_STORED_EVENTS = 50;

export interface LocalStorageEvent extends StoredEvent {
  localOnly: boolean;
}

/**
 * Get events from localStorage
 */
export function getLocalEvents(): LocalStorageEvent[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to read from localStorage:', error);
    return [];
  }
}

/**
 * Save an event to localStorage (for fallback when backend read endpoint doesn't exist)
 */
export function saveLocalEvent(event: StoredEvent): void {
  try {
    const existing = getLocalEvents();
    
    // Deduplicate by ID - remove any existing event with the same ID
    const filtered = existing.filter((e) => e.id !== event.id);
    
    // Add new event at the beginning, keep max 50
    const updated: LocalStorageEvent[] = [
      { ...event, localOnly: true },
      ...filtered,
    ].slice(0, MAX_STORED_EVENTS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

/**
 * Clear all local events
 */
export function clearLocalEvents(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
}

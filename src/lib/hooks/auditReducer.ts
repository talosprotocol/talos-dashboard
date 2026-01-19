/**
 * Audit State Machine - Reducer Implementation
 * 
 * This is the concrete reducer shape to eliminate races and infinite loops.
 * All state transitions are explicit and atomic.
 */

import type { AuditEvent } from '@/lib/data/schemas';
import type { AuditFilters } from '@/lib/data/DataSourceTypes';
import { validateCursor, compareCursor } from '@/lib/integrity/cursor';

// =============================================================================
// State Types
// =============================================================================

export type AuditPhase = 
  | 'idle'
  | 'loading_initial'
  | 'ready'
  | 'loading_more'
  | 'refreshing'
  | 'error';

export type ConnectionState = 
  | 'connected'
  | 'reconnecting'
  | 'auth_failed'
  | 'disconnected';

export interface AuditState {
  // Phase control
  phase: AuditPhase;
  
  // Data (canonical storage)
  eventsById: Map<string, AuditEvent>;
  orderedIds: string[];  // Sorted DESC by cursor
  
  // Pagination
  cursorOldest: string | undefined;
  hasMore: boolean;
  
  // Request tracking
  inflightRequestId: string | null;
  
  // Filters
  filters: AuditFilters;
  
  // Connection state
  connectionState: ConnectionState;
  
  // Error state
  error: { code: string; message: string } | null;
  
  // Cursor validation
  cursorInvalidIds: Set<string>;
}

// =============================================================================
// Action Types
// =============================================================================

export type AuditAction =
  | { type: 'FILTERS_CHANGED'; filters: AuditFilters }
  | { type: 'FETCH_INITIAL_START'; requestId: string }
  | { type: 'FETCH_INITIAL_SUCCESS'; requestId: string; events: AuditEvent[]; nextCursor?: string; hasMore: boolean }
  | { type: 'FETCH_INITIAL_ERROR'; requestId: string; error: Error }
  | { type: 'FETCH_MORE_START'; requestId: string }
  | { type: 'FETCH_MORE_SUCCESS'; requestId: string; events: AuditEvent[]; nextCursor?: string; hasMore: boolean }
  | { type: 'FETCH_MORE_ERROR'; requestId: string; error: Error }
  | { type: 'SSE_EVENT_RECEIVED'; event: AuditEvent }
  | { type: 'SSE_CONNECTION_STATE_CHANGED'; state: ConnectionState }
  | { type: 'REFRESH_START'; requestId: string }
  | { type: 'REFRESH_SUCCESS'; requestId: string; events: AuditEvent[] }
  | { type: 'REFRESH_ERROR'; requestId: string; error: Error }
  | { type: 'REQUEST_ABORTED'; requestId: string };

// =============================================================================
// Initial State
// =============================================================================

export const initialAuditState: AuditState = {
  phase: 'idle',
  eventsById: new Map(),
  orderedIds: [],
  cursorOldest: undefined,
  hasMore: true,
  inflightRequestId: null,
  filters: {},
  connectionState: 'disconnected',
  error: null,
  cursorInvalidIds: new Set(),
};

// =============================================================================
// Dedupe and Merge Logic
// =============================================================================

/**
 * Merge new events into existing state.
 * 
 * Dedupe Rules:
 * 1. event_id is the canonical dedupe key
 * 2. If event_id is missing -> mark as invalid, surface warning
 * 3. Cursor-invalid events are stored but excluded from pagination computations
 * 4. Ordering is always by cursor (DESC)
 */
function mergeEvents(
  state: AuditState,
  newEvents: AuditEvent[]
): Pick<AuditState, 'eventsById' | 'orderedIds' | 'cursorInvalidIds'> {
  // CRITICAL: Create NEW Map and Set (immutability for React)
  const eventsById = new Map(state.eventsById);
  const cursorInvalidIds = new Set(state.cursorInvalidIds);
  
  // Add/update events
  for (const event of newEvents) {
    // Validate event has ID
    if (!event.event_id) {
      console.error('[AuditReducer] Event missing event_id:', event);
      continue; // Skip - cannot dedupe
    }
    
    // Validate cursor using talos-contracts
    const validation = validateCursor(event);
    if (!validation.ok) {
      cursorInvalidIds.add(event.event_id);
      console.warn(`[AuditReducer] Cursor validation failed: ${validation.reason}`, {
        event_id: event.event_id,
        cursor: event.cursor
      });
    }
    
    eventsById.set(event.event_id, event);
  }
  
  // Rebuild ordered IDs (sort by cursor DESC using talos-contracts comparator)
  const orderedIds = Array.from(eventsById.keys()).sort((a, b) => {
    const eventA = eventsById.get(a)!;
    const eventB = eventsById.get(b)!;
    
    // Invalid cursors go to end
    if (cursorInvalidIds.has(a) && !cursorInvalidIds.has(b)) return 1;
    if (!cursorInvalidIds.has(a) && cursorInvalidIds.has(b)) return -1;
    
    // Use talos-contracts cursor comparator (DESC order)
    return compareCursor(eventB.cursor || '', eventA.cursor || '');
  });
  
  return { eventsById, orderedIds, cursorInvalidIds };
}

/**
 * Compute oldest valid cursor for pagination.
 */
function computeOldestCursor(state: AuditState): string | undefined {
  // Find last event with valid cursor
  for (let i = state.orderedIds.length - 1; i >= 0; i--) {
    const id = state.orderedIds[i];
    if (!state.cursorInvalidIds.has(id)) {
      return state.eventsById.get(id)?.cursor;
    }
  }
  return undefined;
}

// =============================================================================
// Reducer
// =============================================================================

export function auditReducer(state: AuditState, action: AuditAction): AuditState {
  switch (action.type) {
    
    // -------------------------------------------------------------------------
    // Filter Changes → Reset and Prepare for Initial Load
    // -------------------------------------------------------------------------
    case 'FILTERS_CHANGED': {
      // Abort any inflight request (caller should handle abort)
      return {
        ...initialAuditState,
        filters: action.filters,
        connectionState: state.connectionState, // Preserve connection
      };
    }
    
    // -------------------------------------------------------------------------
    // Initial Fetch
    // -------------------------------------------------------------------------
    case 'FETCH_INITIAL_START': {
      // Only allow if idle or error
      if (state.phase !== 'idle' && state.phase !== 'error') {
        return state;
      }
      
      return {
        ...state,
        phase: 'loading_initial',
        inflightRequestId: action.requestId,
        error: null,
      };
    }
    
    case 'FETCH_INITIAL_SUCCESS': {
      // Ignore if requestId doesn't match (aborted request)
      if (state.inflightRequestId !== action.requestId) {
        console.log('[AuditReducer] Ignoring stale FETCH_INITIAL_SUCCESS');
        return state;
      }
      
      const merged = mergeEvents(state, action.events);
      
      return {
        ...state,
        ...merged,
        phase: 'ready',
        cursorOldest: computeOldestCursor({ ...state, ...merged }),
        hasMore: action.hasMore,
        inflightRequestId: null,
      };
    }
    
    case 'FETCH_INITIAL_ERROR': {
      if (state.inflightRequestId !== action.requestId) {
        return state;
      }
      
      return {
        ...state,
        phase: 'error',
        error: {
          code: 'FETCH_FAILED',
          message: action.error.message,
        },
        inflightRequestId: null,
      };
    }
    
    // -------------------------------------------------------------------------
    // Pagination (Fetch More)
    // -------------------------------------------------------------------------
    case 'FETCH_MORE_START': {
      // Only allow if ready and not already loading
      if (state.phase !== 'ready' || state.inflightRequestId !== null) {
        return state;
      }
      
      if (!state.hasMore) {
        return state; // Noop if no more
      }
      
      return {
        ...state,
        phase: 'loading_more',
        inflightRequestId: action.requestId,
      };
    }
    
    case 'FETCH_MORE_SUCCESS': {
      if (state.inflightRequestId !== action.requestId) {
        console.log('[AuditReducer] Ignoring stale FETCH_MORE_SUCCESS');
        return state;
      }
      
      const merged = mergeEvents(state, action.events);
      
      return {
        ...state,
        ...merged,
        phase: 'ready',
        cursorOldest: computeOldestCursor({ ...state, ...merged }),
        hasMore: action.hasMore,
        inflightRequestId: null,
      };
    }
    
    case 'FETCH_MORE_ERROR': {
      if (state.inflightRequestId !== action.requestId) {
        return state;
      }
      
      // Don't go to error phase, just stop loading
      return {
        ...state,
        phase: 'ready',
        error: {
          code: 'PAGINATION_FAILED',
          message: action.error.message,
        },
        inflightRequestId: null,
      };
    }
    
    // -------------------------------------------------------------------------
    // SSE Events (Real-time Ingest)
    // -------------------------------------------------------------------------
    case 'SSE_EVENT_RECEIVED': {
      // Filter events on client side if needed
      // (Ideally server should filter, but fallback here)
      const event = action.event;
      
      // Dedupe by event_id
      if (state.eventsById.has(event.event_id)) {
        return state; // Already have this event
      }
      
      // Merge single event (prepend to list)
      const merged = mergeEvents(state, [event]);
      
      return {
        ...state,
        ...merged,
        cursorOldest: computeOldestCursor({ ...state, ...merged }),
      };
    }
    
    // -------------------------------------------------------------------------
    // Connection State
    // -------------------------------------------------------------------------
    case 'SSE_CONNECTION_STATE_CHANGED': {
      return {
        ...state,
        connectionState: action.state,
      };
    }
    
    // -------------------------------------------------------------------------
    // Refresh/Reconcile (e.g., after reconnect)
    // -------------------------------------------------------------------------
    case 'REFRESH_START': {
      // Can refresh from any state except loading_initial
      if (state.phase === 'loading_initial') {
        return state;
      }
      
      return {
        ...state,
        phase: 'refreshing',
        inflightRequestId: action.requestId,
      };
    }
    
    case 'REFRESH_SUCCESS': {
      if (state.inflightRequestId !== action.requestId) {
        return state;
      }
      
      // Merge refreshed events (dedupe automatically)
      const merged = mergeEvents(state, action.events);
      
      return {
        ...state,
        ...merged,
        phase: 'ready',
        cursorOldest: computeOldestCursor({ ...state, ...merged }),
        inflightRequestId: null,
      };
    }
    
    case 'REFRESH_ERROR': {
      if (state.inflightRequestId !== action.requestId) {
        return state;
      }
      
      return {
        ...state,
        phase: 'ready', // Return to ready, don't error out
        inflightRequestId: null,
      };
    }
    
    // -------------------------------------------------------------------------
    // Request Abort
    // -------------------------------------------------------------------------
    case 'REQUEST_ABORTED': {
      if (state.inflightRequestId !== action.requestId) {
        return state;
      }
      
      return {
        ...state,
        phase: state.phase === 'loading_initial' ? 'idle' : 'ready',
        inflightRequestId: null,
      };
    }
    
    default:
      return state;
  }
}

// =============================================================================
// Selectors (For Component Use)
// =============================================================================

/**
 * Get ordered events for display.
 */
export function selectOrderedEvents(state: AuditState): AuditEvent[] {
  return state.orderedIds.map(id => state.eventsById.get(id)!);
}

/**
 * Get events with invalid cursors (for warning display).
 */
export function selectInvalidEvents(state: AuditState): AuditEvent[] {
  return Array.from(state.cursorInvalidIds)
    .map(id => state.eventsById.get(id))
    .filter((e): e is AuditEvent => e !== undefined);
}

/**
 * Check if can fetch more.
 */
export function selectCanFetchMore(state: AuditState): boolean {
  return state.phase === 'ready' && state.hasMore && state.inflightRequestId === null;
}

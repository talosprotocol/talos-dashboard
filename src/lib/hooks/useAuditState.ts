/**
 * Audit State Machine - Reducer Hook
 * 
 * Manages audit event state using reducer pattern for atomic transitions.
 * Prevents race conditions and infinite loops.
 */

export { auditReducer, initialAuditState } from './auditReducer';
export type { AuditState, AuditAction, AuditPhase, ConnectionState } from './auditReducer';
export { 
  selectOrderedEvents, 
  selectInvalidEvents, 
  selectCanFetchMore 
} from './auditReducer';

import { useReducer, useCallback, useEffect, useRef } from 'react';
import type { AuditState, AuditAction } from './auditReducer';
import { auditReducer, initialAuditState } from './auditReducer';
import type { AuditFilters } from '@/lib/data/DataSourceTypes';

interface UseAuditStateReturn {
  state: AuditState;
  dispatch: React.Dispatch<AuditAction>;
  fetchInitial: () => Promise<void>;
  fetchMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAuditState(filters: AuditFilters): UseAuditStateReturn {
  const [state, dispatch] = useReducer(auditReducer, initialAuditState);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch initial data
  const fetchInitial = useCallback(async () => {
    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const requestId = crypto.randomUUID();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    dispatch({ type: 'FETCH_INITIAL_START', requestId });

    try {
      const res = await fetch('/api/events?limit=50', {
        signal: abortController.signal,
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status}`);
      }

      const data = await res.json();

      dispatch({
        type: 'FETCH_INITIAL_SUCCESS',
        requestId,
        events: data.items,
        nextCursor: data.next_cursor,
        hasMore: data.has_more,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        dispatch({ type: 'REQUEST_ABORTED', requestId });
      } else {
        dispatch({
          type: 'FETCH_INITIAL_ERROR',
          requestId,
          error: error as Error,
        });
      }
    }
  }, []);

  // Fetch more for pagination
  const fetchMore = useCallback(async () => {
    if (state.phase !== 'ready' || !state.hasMore || state.inflightRequestId) {
      return; // Guard against invalid state
    }

    const requestId = crypto.randomUUID();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    dispatch({ type: 'FETCH_MORE_START', requestId });

    try {
      const url = `/api/events?limit=50${state.cursorOldest ? `&before=${state.cursorOldest}` : ''}`;
      const res = await fetch(url, {
        signal: abortController.signal,
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status}`);
      }

      const data = await res.json();

      dispatch({
        type: 'FETCH_MORE_SUCCESS',
        requestId,
        events: data.items,
        nextCursor: data.next_cursor,
        hasMore: data.has_more,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        dispatch({ type: 'REQUEST_ABORTED', requestId });
      } else {
        dispatch({
          type: 'FETCH_MORE_ERROR',
          requestId,
          error: error as Error,
        });
      }
    }
  }, [state.phase, state.hasMore, state.inflightRequestId, state.cursorOldest]);

  // Refresh (reconcile) - fetch newest events
  const refresh = useCallback(async () => {
    const requestId = crypto.randomUUID();

    dispatch({ type: 'REFRESH_START', requestId });

    try {
      const res = await fetch('/api/events?limit=10'); // Fetch newest 10

      if (!res.ok) {
        throw new Error(`Failed to refresh: ${res.status}`);
      }

      const data = await res.json();

      dispatch({
        type: 'REFRESH_SUCCESS',
        requestId,
        events: data.items,
      });
    } catch (error) {
      dispatch({
        type: 'REFRESH_ERROR',
        requestId,
        error: error as Error,
      });
    }
  }, []);

  // Trigger initial fetch when filters change
  useEffect(() => {
    dispatch({ type: 'FILTERS_CHANGED', filters });
    fetchInitial();
  }, [filters, fetchInitial]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    state,
    dispatch,
    fetchInitial,
    fetchMore,
    refresh,
  };
}

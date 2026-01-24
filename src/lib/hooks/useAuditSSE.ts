/**
 * Audit SSE Connection Hook
 * 
 * Manages SSE connection lifecycle for live audit events.
 * Handles reconnection, auth failures, and event filtering.
 */

import { useEffect, useRef } from 'react';
import type { AuditEvent } from '@/lib/data/schemas';
import type { AuditFilters } from '@/lib/data/DataSourceTypes';
import type { AuditAction, ConnectionState } from './useAuditState';

interface UseAuditSSEOptions {
  filters: AuditFilters;
  dispatch: React.Dispatch<AuditAction>;
  onConnectionChange?: (state: ConnectionState) => void;
}

/**
 * Filter event against current filters.
 */
function matchesFilters(event: AuditEvent, filters: AuditFilters): boolean {
  if (filters.session_id && event.session_id !== filters.session_id) return false;
  if (filters.outcome && event.outcome !== filters.outcome) return false;
  if (filters.correlation_id && event.correlation_id !== filters.correlation_id) return false;
  if (filters.denial_reason && event.denial_reason !== filters.denial_reason) return false;
  return true;
}

export function useAuditSSE({ filters, dispatch, onConnectionChange }: UseAuditSSEOptions) {
  const filtersRef = useRef(filters);
  const dispatchRef = useRef(dispatch);
  const onConnectionChangeRef = useRef(onConnectionChange);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Keep refs updated
  useEffect(() => {
    filtersRef.current = filters;
    dispatchRef.current = dispatch;
    onConnectionChangeRef.current = onConnectionChange;
  });

  useEffect(() => {
    let es: EventSource | null = null;
    const updateConnectionState = (newState: ConnectionState) => {
      dispatchRef.current({ type: 'SSE_CONNECTION_STATE_CHANGED', state: newState });
      onConnectionChangeRef.current?.(newState);
    };

    const connect = () => {
      // Clean up existing connection
      if (es) {
        es.close();
      }

      es = new EventSource('/api/audit/stream');

      es.addEventListener('meta', (e: MessageEvent) => {
        console.log('[AuditSSE] Connected', JSON.parse(e.data));
        updateConnectionState('connected');
      });

      es.addEventListener('audit_event', (e: MessageEvent) => {
        try {
          const event: AuditEvent = JSON.parse(e.data);

          // Apply filters (server sends full firehose)
          if (!matchesFilters(event, filtersRef.current)) {
            return;
          }

          dispatchRef.current({ type: 'SSE_EVENT_RECEIVED', event });
        } catch (err) {
          console.error('[AuditSSE] Parse error', err);
        }
      });

      es.addEventListener('heartbeat', () => {
        // Keep-alive received
      });

      es.addEventListener('error', (e: MessageEvent) => {
        try {
          const err = JSON.parse(e.data);
          console.error('[AuditSSE] Server Error:', err);
          es?.close();
        } catch {
          // Not JSON, generic error
        }
      });

      es.onerror = () => {
        console.error('[AuditSSE] Connection error');
        updateConnectionState('reconnecting');

        // Retry connection with exponential backoff
        const retryDelay = 2000;
        reconnectTimeoutRef.current = setTimeout(connect, retryDelay);
      };
    };

    // Initial connection
    connect();

    // Cleanup
    return () => {
      if (es) {
        es.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []); // Empty deps - use refs for dynamic values

  return null;
}

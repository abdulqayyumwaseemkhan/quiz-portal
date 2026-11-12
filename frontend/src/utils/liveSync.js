import { useEffect, useRef } from 'react';

// Lightweight multi-tab & cross-window broadcast channel
let channel = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel('quiz_portal_live_sync');
  }
} catch {
  // BroadcastChannel unavailable
}

/**
 * Broadcasts a live update event across browser tabs and local window
 */
export const broadcastLiveUpdate = (type, payload = {}) => {
  try {
    if (channel) {
      channel.postMessage({ type, payload, timestamp: Date.now() });
    }
  } catch {
    // ignore
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('quiz-portal:live-update', { detail: { type, payload } })
    );
  }
};

/**
 * Subscribes to live update events
 */
export const subscribeLiveUpdate = (callback) => {
  if (typeof window === 'undefined') return () => {};

  const handleMessage = (event) => {
    if (event?.data) callback(event.data);
  };
  const handleCustomEvent = (event) => {
    if (event?.detail) callback(event.detail);
  };

  if (channel) {
    channel.addEventListener('message', handleMessage);
  }
  window.addEventListener('quiz-portal:live-update', handleCustomEvent);

  return () => {
    if (channel) {
      channel.removeEventListener('message', handleMessage);
    }
    window.removeEventListener('quiz-portal:live-update', handleCustomEvent);
  };
};

/**
 * React Hook for silent, non-flickering background revalidation
 * Supports:
 * 1. BroadcastChannel instant multi-tab sync (< 10ms)
 * 2. Window focus & tab visibility change instant re-sync
 * 3. Smart interval polling when tab is active (default 10s)
 */
export const useLiveRefresh = (fetchFn, intervalMs = 10000, eventTypes = []) => {
  const fetchRef = useRef(fetchFn);

  useEffect(() => {
    fetchRef.current = fetchFn;
  }, [fetchFn]);

  useEffect(() => {
    // 1. Event listener
    const unsubscribe = subscribeLiveUpdate((data) => {
      if (!eventTypes.length || eventTypes.includes(data.type)) {
        fetchRef.current?.(true); // true = silent refresh
      }
    });

    // 2. Focus & visibility change
    const handleFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchRef.current?.(true);
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // 3. Periodic silent polling
    let timer = null;
    if (intervalMs > 0) {
      timer = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          fetchRef.current?.(true);
        }
      }, intervalMs);
    }

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      if (timer) clearInterval(timer);
    };
  }, [intervalMs, eventTypes]);
};

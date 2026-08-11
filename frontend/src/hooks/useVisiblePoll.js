import { useEffect, useRef } from 'react';

/**
 * Calls `onPoll` every `intervalMs` for as long as the tab is visible.
 *
 * Polling stops entirely while the tab is hidden, and fires once immediately
 * when it comes back. That is not only about saving requests: opening a
 * reclamation stamps its read watermark server-side, so a poll running in a
 * background tab would keep marking replies read for someone who is not
 * looking at them — and the unread badge they are owed would never appear.
 *
 * Pass `intervalMs = 0` or `enabled = false` to suspend without unmounting.
 */
export function useVisiblePoll(onPoll, intervalMs, { enabled = true } = {}) {
  // Kept in a ref so changing the callback each render doesn't restart the
  // timer — otherwise a poll would never fire on a page that re-renders
  // faster than its own interval.
  const callback = useRef(onPoll);
  useEffect(() => {
    callback.current = onPoll;
  }, [onPoll]);

  useEffect(() => {
    if (!enabled || !intervalMs) return undefined;

    let timer = null;
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    const start = () => {
      stop();
      timer = setInterval(() => callback.current(), intervalMs);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Catch up on whatever arrived while we were away before resuming the
        // cadence, so coming back to the tab never shows a stale conversation.
        callback.current();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, intervalMs]);
}

// Cadence for a conversation view. Fast only while an exchange is actually
// happening — that narrow window is the one the feature gets judged on, and it
// costs a few dozen extra requests per conversation, not per day.
const ACTIVE_MS = 30_000;
const RECENT_MS = 120_000;
const IDLE_MS = 300_000;

/**
 * Poll interval for a thread, from how long ago its last message landed.
 *
 * Recomputed on every render: each poll replaces the thread state, so even a
 * conversation that goes quiet re-renders and slides down to the slower tiers
 * on its own.
 */
export function threadPollInterval(lastMessageAt) {
  if (!lastMessageAt) return IDLE_MS;

  const age = Date.now() - new Date(lastMessageAt).getTime();
  if (Number.isNaN(age)) return IDLE_MS;
  if (age < 2 * 60_000) return ACTIVE_MS;
  if (age < 10 * 60_000) return RECENT_MS;

  return IDLE_MS;
}

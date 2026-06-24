const MIN_VISIBLE_MS = 600;

let activeRequests = 0;
let hideTimer = null;
let visibleSince = 0;
let isVisible = false;
const listeners = new Set();

const flushHide = () => {
  hideTimer = null;
  isVisible = false;
  visibleSince = 0;
  notify();
};

const showNow = () => {
  if (isVisible) return;
  isVisible = true;
  visibleSince = Date.now();
  notify();
};

export const showLoading = () => {
  if (hideTimer !== null) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }

  activeRequests += 1;
  showNow();
};

export const hideLoading = () => {
  if (activeRequests > 0) activeRequests -= 1;
  if (activeRequests > 0) return;

  if (!isVisible) {
    flushHide();
    return;
  }

  const elapsed = Date.now() - visibleSince;
  const remaining = MIN_VISIBLE_MS - elapsed;

  if (remaining <= 0) {
    flushHide();
  } else {
    hideTimer = setTimeout(flushHide, remaining);
  }
};

export const subscribeLoading = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

const notify = () => {
  listeners.forEach((cb) => cb(isVisible));
};

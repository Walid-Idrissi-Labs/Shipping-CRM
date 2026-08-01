// Full-screen feedback for explicit file downloads (PDF generation, etc.) —
// separate channel from loadingService, which only covers mutations/GETs
// handled by page-level skeletons. Downloads are a deliberate wait the user
// is staring at, so they get a distinct, more prominent overlay.
const MIN_VISIBLE_MS = 600;

let activeRequests = 0;
let hideTimer = null;
let visibleSince = 0;
let isVisible = false;
let currentLabel = '';
const listeners = new Set();

const flushHide = () => {
  hideTimer = null;
  isVisible = false;
  visibleSince = 0;
  currentLabel = '';
  notify();
};

const showNow = (label) => {
  currentLabel = label;
  if (isVisible) {
    notify();
    return;
  }
  isVisible = true;
  visibleSince = Date.now();
  notify();
};

export const showDownload = (label = 'Téléchargement en cours…') => {
  if (hideTimer !== null) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }

  activeRequests += 1;
  showNow(label);
};

export const hideDownload = () => {
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

export const subscribeDownload = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

const notify = () => {
  listeners.forEach((cb) => cb({ active: isVisible, label: currentLabel }));
};

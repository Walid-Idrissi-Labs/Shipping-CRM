import { useCallback } from 'react';
import { showDownload, hideDownload } from '../api/downloadService';

/**
 * Wraps a file-download task (PDF generation, blob fetch, etc.) with the
 * full-screen DownloadOverlay. Errors are left to the caller — this only
 * guarantees the overlay shows for the duration of the task and always
 * hides afterward, success or failure.
 */
export function useFileDownload() {
  return useCallback(async (task, label) => {
    showDownload(label);
    try {
      return await task();
    } finally {
      hideDownload();
    }
  }, []);
}

export default useFileDownload;

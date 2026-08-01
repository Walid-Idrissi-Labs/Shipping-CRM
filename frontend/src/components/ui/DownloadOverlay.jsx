import { useEffect, useState } from 'react';
import { subscribeDownload } from '../../api/downloadService';
import OrbitLoader from './OrbitLoader';

export default function DownloadOverlay() {
  const [state, setState] = useState({ active: false, label: '' });

  useEffect(() => subscribeDownload(setState), []);

  if (!state.active) return null;

  return (
    <div className="download-overlay" role="status" aria-live="polite">
      <div className="download-overlay-panel">
        <OrbitLoader />
        <p className="download-overlay-label">{state.label}</p>
      </div>
    </div>
  );
}

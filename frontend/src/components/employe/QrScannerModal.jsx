import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Zap, SwitchCamera, Keyboard } from 'lucide-react';

/**
 * Étiquette labels carry a Code 128 barcode. Naming the formats we expect is what
 * makes 1D decoding fast — an unhinted reader tries every symbology on every frame
 * and drops the frame rate low enough that a barcode rarely lands a clean read.
 * QR stays enabled so older labels keep working.
 */
const FORMAT_NAMES = [
  'CODE_128',
  'CODE_39',
  'CODE_93',
  'ITF',
  'CODABAR',
  'EAN_13',
  'EAN_8',
  'UPC_A',
  'UPC_E',
  'QR_CODE',
];

/** A scan may be a bare number, a JSON payload, or a tracking URL. */
function extractShippingNumber(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';

  try {
    const parsed = JSON.parse(text);
    if (parsed?.shipping_number) return String(parsed.shipping_number).trim();
  } catch {
    // Not JSON — keep going.
  }

  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      const fromQuery = url.searchParams.get('shipping_number') || url.searchParams.get('n');
      if (fromQuery) return fromQuery.trim();
      const lastSegment = url.pathname.split('/').filter(Boolean).pop();
      if (lastSegment) return decodeURIComponent(lastSegment).trim();
    } catch {
      // Malformed URL — fall through.
    }
  }

  return text;
}

export default function QrScannerModal({ open, onClose, onScan }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const streamRef = useRef(null);
  const handledRef = useRef(false);

  // Keeps the scanner from restarting every time the parent re-renders.
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  });

  const [status, setStatus] = useState('starting'); // starting | scanning | error
  const [error, setError] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [deviceId, setDeviceId] = useState(null);

  const stopScanner = useCallback(() => {
    try {
      readerRef.current?.reset();
    } catch {
      // reset() throws if it was never started; nothing to clean up then.
    }
    readerRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) videoRef.current.srcObject = null;
    setTorchOn(false);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    handledRef.current = false;
    setStatus('starting');
    setError('');
    setTorchOn(false);

    const fail = (message) => {
      if (cancelled) return;
      setError(message);
      setStatus('error');
    };

    const start = async () => {
      // getUserMedia only exists in a secure context. Over plain http:// on a phone
      // (e.g. http://192.168.x.x) the whole API is missing, not merely blocked.
      if (!navigator.mediaDevices?.getUserMedia) {
        fail(
          window.isSecureContext
            ? "Ce navigateur ne permet pas l'accès à la caméra."
            : "La caméra exige une connexion sécurisée (HTTPS). Ouvrez l'application en https:// ou saisissez le numéro à la main."
        );
        return;
      }

      try {
        const { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } = await import('@zxing/library');
        if (cancelled) return;

        const hints = new Map();
        hints.set(
          DecodeHintType.POSSIBLE_FORMATS,
          FORMAT_NAMES.map((name) => BarcodeFormat[name]).filter((f) => f !== undefined)
        );
        hints.set(DecodeHintType.TRY_HARDER, true);

        const reader = new BrowserMultiFormatReader(hints, 200);
        // Retry interval between "nothing found" frames. The default is 0, i.e. a tight
        // decode loop that pegs the CPU and makes the preview stutter on a phone.
        reader.timeBetweenDecodingAttempts = 100;
        readerRef.current = reader;

        // One stream, opened once. Asking for the rear camera by facingMode works on
        // the first run; device labels are empty until permission is granted, so
        // picking the camera by label before that always fell through to the front one.
        const constraints = deviceId
          ? { video: { deviceId: { exact: deviceId } } }
          : { video: { facingMode: { ideal: 'environment' } } };

        constraints.video.width = { ideal: 1280 };
        constraints.video.height = { ideal: 720 };

        await reader.decodeFromConstraints(constraints, videoRef.current, (result) => {
          if (!result || handledRef.current) return;
          const shippingNumber = extractShippingNumber(result.getText());
          if (!shippingNumber) return;

          handledRef.current = true;
          navigator.vibrate?.(60);
          stopScanner();
          onScanRef.current?.(shippingNumber);
        });

        if (cancelled) {
          try {
            reader.reset();
          } catch {
            // Already torn down.
          }
          return;
        }

        streamRef.current = videoRef.current?.srcObject || null;
        setStatus('scanning');

        const track = streamRef.current?.getVideoTracks?.()[0];
        setTorchAvailable(Boolean(track?.getCapabilities?.().torch));

        // Labels are only populated post-permission, so enumerate now to build the switcher.
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;
        setCameras(devices.filter((d) => d.kind === 'videoinput'));
      } catch (err) {
        if (cancelled) return;
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          fail("Accès caméra refusé. Autorisez la caméra dans les réglages du navigateur, puis rouvrez le scanner.");
        } else if (err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError') {
          fail('Aucune caméra utilisable trouvée sur cet appareil.');
        } else if (err?.name === 'NotReadableError') {
          fail("La caméra est déjà utilisée par une autre application.");
        } else {
          fail("Impossible d'accéder à la caméra.");
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [open, deviceId, stopScanner]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn((on) => !on);
    } catch {
      setTorchAvailable(false);
    }
  };

  const switchCamera = () => {
    if (cameras.length < 2) return;
    const currentId = deviceId || streamRef.current?.getVideoTracks?.()[0]?.getSettings?.().deviceId;
    const index = cameras.findIndex((c) => c.deviceId === currentId);
    const next = cameras[(index + 1) % cameras.length];
    stopScanner();
    setDeviceId(next.deviceId); // re-runs the effect with the new device
  };

  const close = (focusManualInput = false) => {
    stopScanner();
    onClose(focusManualInput);
  };

  if (!open) return null;

  return (
    <div className="dialog-backdrop" onClick={() => close(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="scanner-title"
        className="dialog-surface emp-scanner"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="emp-scanner-head">
          <h2 id="scanner-title">Scanner l'étiquette</h2>
          <button type="button" onClick={() => close(false)} className="emp-scanner-close" aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        <div className="emp-scanner-stage">
          {status === 'error' ? (
            <div className="emp-scanner-error">
              <p className="emp-scanner-error-title">Caméra indisponible</p>
              <p className="emp-scanner-error-msg">{error}</p>
              <button type="button" onClick={() => close(true)} className="btn btn-primary" style={{ minWidth: 200 }}>
                <Keyboard size={16} /> Saisir le numéro
              </button>
            </div>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="emp-scanner-video" />

              {/* Wide frame — an étiquette barcode is a long strip, not a square */}
              <div className="emp-scanner-overlay">
                <div className="emp-scanner-frame">
                  <span className="emp-scanner-corner tl" />
                  <span className="emp-scanner-corner tr" />
                  <span className="emp-scanner-corner bl" />
                  <span className="emp-scanner-corner br" />
                  {status === 'scanning' && <span className="emp-scanner-laser" />}
                </div>
                <p className="emp-scanner-hint">
                  {status === 'starting'
                    ? 'Démarrage de la caméra...'
                    : 'Placez le code-barres dans le cadre'}
                </p>
              </div>

              <div className="emp-scanner-controls">
                {cameras.length > 1 && (
                  <button
                    type="button"
                    onClick={switchCamera}
                    className="emp-scanner-fab"
                    aria-label="Changer de caméra"
                  >
                    <SwitchCamera size={22} />
                  </button>
                )}
                {torchAvailable && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`emp-scanner-fab${torchOn ? ' is-on' : ''}`}
                    aria-label={torchOn ? 'Éteindre la lampe' : 'Allumer la lampe'}
                    aria-pressed={torchOn}
                  >
                    <Zap size={22} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="emp-scanner-foot">
          <button type="button" onClick={() => close(true)} className="btn btn-secondary" style={{ width: '100%' }}>
            <Keyboard size={16} /> Saisir le numéro à la main
          </button>
        </div>
      </div>
    </div>
  );
}

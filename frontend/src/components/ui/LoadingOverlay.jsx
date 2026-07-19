import OrbitLoader from './OrbitLoader';

export default function LoadingOverlay() {
  return (
    <div className="loader-overlay" aria-hidden="true">
      <OrbitLoader />
    </div>
  );
}

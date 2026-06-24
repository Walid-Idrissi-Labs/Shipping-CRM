import TruckLoader from './TruckLoader';

export default function LoadingOverlay() {
  return (
    <div className="truck-loader-overlay" aria-hidden="true">
      <TruckLoader />
    </div>
  );
}

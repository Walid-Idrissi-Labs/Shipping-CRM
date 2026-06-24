import { createContext, useCallback, useContext, useState } from 'react';
import SuccessModal from '../components/ui/SuccessModal';

const SuccessContext = createContext(null);

export function SuccessModalProvider({ children }) {
  const [state, setState] = useState(null);

  const show = useCallback((opts) => {
    setState({ ...opts, open: true });
  }, []);

  const hide = useCallback(() => {
    setState(null);
  }, []);

  return (
    <SuccessContext.Provider value={{ show, hide }}>
      {children}
      {state && (
        <SuccessModal
          open={state.open}
          title={state.title}
          message={state.message}
          icon={state.icon}
          detail={state.detail}
          primaryAction={state.primaryAction}
          secondaryActions={state.secondaryActions}
          onClose={hide}
        />
      )}
    </SuccessContext.Provider>
  );
}

export function useSuccess() {
  const ctx = useContext(SuccessContext);
  if (!ctx) {
    throw new Error('useSuccess must be used within a SuccessModalProvider');
  }
  return ctx;
}

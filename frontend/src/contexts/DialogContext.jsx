import { createContext, useCallback, useContext, useState } from 'react';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  const [state, setState] = useState(null);

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      setState({
        ...opts,
        resolve: (val) => {
          setState(null);
          resolve(val);
        },
      });
    });
  }, []);

  const handleConfirm = () => state?.resolve(true);
  const handleCancel = () => state?.resolve(false);

  return (
    <DialogContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <ConfirmDialog
          open
          title={state.title}
          description={state.description}
          confirmText={state.confirmText}
          cancelText={state.cancelText}
          variant={state.variant}
          safetyGate={state.safetyGate}
          requiredInput={state.requiredInput}
          inputLabel={state.inputLabel}
          inputPlaceholder={state.inputPlaceholder}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return ctx;
}

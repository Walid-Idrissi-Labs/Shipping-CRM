import { createContext, useEffect, useState } from 'react';
import { subscribeLoading } from '../api/loadingService';

const LoadingContext = createContext({ isLoading: false });

export function LoadingProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    return subscribeLoading(setIsLoading);
  }, []);

  return (
    <LoadingContext.Provider value={{ isLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

export default LoadingContext;

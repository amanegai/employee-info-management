import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const MessageContext = createContext(null);

export function MessageProvider({ children }) {
  const [message, setMessage] = useState(null);
  const timerRef = useRef(null);

  const clearMessage = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setMessage(null);
  }, []);

  const showMessage = useCallback(
    (text, type = 'info') => {
      if (!text) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      setMessage({ text, type, at: Date.now() });
      timerRef.current = setTimeout(() => {
        setMessage(null);
        timerRef.current = null;
      }, 6000);
    },
    []
  );

  const value = useMemo(
    () => ({ message, showMessage, clearMessage }),
    [message, showMessage, clearMessage]
  );

  return <MessageContext.Provider value={value}>{children}</MessageContext.Provider>;
}

export function useAppMessage() {
  const ctx = useContext(MessageContext);
  if (!ctx) {
    throw new Error('useAppMessage must be used within MessageProvider');
  }
  return ctx;
}

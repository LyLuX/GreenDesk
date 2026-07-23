import { createContext, useCallback, useEffect, useRef, useState } from 'react';
export const NotificationContext = createContext(null);
export function NotificationProvider({ children }) {
  const [items, setItems] = useState([]);
  const timers = useRef(new Map());
  useEffect(
    () => () => {
      timers.current.forEach((timer) => clearTimeout(timer));
    },
    [],
  );
  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);
  const notify = useCallback(
    (type, message) => {
      const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      setItems((current) => [...current, { id, type, message }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), 4000),
      );
    },
    [dismiss],
  );
  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div className="fixed right-4 top-4 z-50 grid gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            role={item.type === 'error' ? 'alert' : 'status'}
            className="rounded bg-slate-900 px-4 py-3 text-white"
          >
            {item.message}
            <button
              aria-label="Fermer la notification"
              className="ml-3"
              onClick={() => dismiss(item.id)}
            >
              x
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

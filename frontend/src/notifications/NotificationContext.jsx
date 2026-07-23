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
      <div className="toast-stack position-fixed top-0 end-0 z-3 m-3 d-grid gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            role={item.type === 'error' ? 'alert' : 'status'}
            className={`alert mb-0 d-flex align-items-start justify-content-between ${
              item.type === 'error'
                ? 'alert-danger'
                : item.type === 'success'
                  ? 'alert-success'
                  : 'alert-secondary'
            }`}
          >
            {item.message}
            <button
              aria-label="Fermer la notification"
              className="btn-close ms-3"
              type="button"
              onClick={() => dismiss(item.id)}
            />
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

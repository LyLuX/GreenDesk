import { createContext, useCallback, useMemo, useState } from 'react';
export const NotificationContext = createContext(null);
export function NotificationProvider({ children }) {
  const [items, setItems] = useState([]);
  const notify = useCallback((type, message) => {
    const id = Date.now();
    setItems((current) => [...current, { id, type, message }]);
    setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 4000);
  }, []);
  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div className="fixed right-4 top-4 z-50 grid gap-2">
        {items.map((item) => (
          <div key={item.id} role="status" className="rounded bg-slate-900 px-4 py-3 text-white">
            {item.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

import { useEffect, useId, useRef } from 'react';
export default function Modal({ open, title, children, onClose, busy = false }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    dialogRef.current?.querySelector('input,select,textarea,button')?.focus();
    const escape = (event) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('keydown', escape);
      previous?.focus?.();
    };
  }, [open, onClose, busy]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 grid place-items-center bg-slate-900/40 p-4"
      onMouseDown={() => !busy && onClose()}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg rounded bg-white p-5 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex justify-between">
          <h2 id={titleId} className="font-semibold">
            {title}
          </h2>
          <button aria-label="Fermer" disabled={busy} onClick={onClose}>
            x
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

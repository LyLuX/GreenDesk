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
      className="modal-backdrop-custom fixed inset-0 z-50 grid place-items-center p-4"
      onMouseDown={() => !busy && onClose()}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="modal-surface w-full max-w-lg bg-white p-5"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-4 d-flex align-items-center justify-content-between">
          <h2 id={titleId} className="h5 mb-0 fw-semibold">
            {title}
          </h2>
          <button
            aria-label="Fermer"
            className="btn-close"
            disabled={busy}
            type="button"
            onClick={onClose}
          />
        </div>
        {children}
      </section>
    </div>
  );
}

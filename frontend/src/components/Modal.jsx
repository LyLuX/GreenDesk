import { useEffect, useId, useRef } from 'react';

/**
 * Displays accessible content above the application with focus and scroll management.
 *
 * @param {object} props Component properties.
 * @param {boolean} props.open Whether the modal is visible.
 * @param {string} props.title Modal title.
 * @param {React.ReactNode} props.children Modal content.
 * @param {() => void} props.onClose Callback used to close the modal.
 * @param {boolean} [props.busy=false] Prevents the modal from closing while an action is running.
 * @param {string} [props.descriptionId] Identifier of the modal description.
 * @returns {JSX.Element | null} The modal when it is open.
 */
export default function Modal({ open, title, children, onClose, busy = false, descriptionId }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(busy);
  onCloseRef.current = onClose;
  busyRef.current = busy;

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector('input,select,textarea,button')?.focus();
    const escape = (event) => {
      if (event.key === 'Escape' && !busyRef.current) onCloseRef.current();
    };
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('keydown', escape);
      document.body.style.overflow = previousOverflow;
      previous?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="modal-backdrop-custom" onMouseDown={() => !busy && onClose()}>
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="modal-surface"
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

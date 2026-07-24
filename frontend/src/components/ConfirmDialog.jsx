import { useId } from 'react';
import Modal from './Modal.jsx';

/**
 * Requests an explicit confirmation before performing a sensitive action.
 *
 * @param {object} props Component properties.
 * @param {boolean} props.open Whether the dialog is visible.
 * @param {string} props.title Dialog title.
 * @param {string} props.description Consequence of the action.
 * @param {string} props.confirmLabel Label of the confirmation button.
 * @param {() => void} props.onConfirm Callback that performs the action.
 * @param {() => void} props.onClose Callback that dismisses the dialog.
 * @param {boolean} [props.busy=false] Disables actions while confirmation is processed.
 * @param {boolean} [props.destructive=true] Uses the destructive action style.
 * @returns {JSX.Element} The confirmation dialog.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  busy = false,
  destructive = true,
}) {
  const descriptionId = useId();

  return (
    <Modal open={open} title={title} descriptionId={descriptionId} onClose={onClose} busy={busy}>
      <p id={descriptionId} className="confirm-dialog-message">
        {description}
      </p>
      <div className="confirm-dialog-actions">
        <button
          className="btn btn-outline-secondary"
          type="button"
          onClick={onClose}
          disabled={busy}
        >
          Annuler
        </button>
        <button
          className={`btn ${destructive ? 'btn-danger' : 'btn-brand'}`}
          type="button"
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? 'Traitement…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

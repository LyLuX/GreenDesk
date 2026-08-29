import { useCallback, useEffect } from 'react';
import { formatDateTime } from '../utils/formatters.js';
import AuthenticatedImage from './AuthenticatedImage.jsx';
import Modal from './Modal.jsx';

/** Displays a material photo at full size and lets users browse the material gallery. */
export default function MaterialPhotoViewer({ photos, selectedUuid, onSelect, onClose }) {
  const selectedIndex = photos.findIndex((photo) => photo.uuid === selectedUuid);
  const selectedPhoto = photos[selectedIndex];
  const canBrowse = photos.length > 1;

  const selectAt = useCallback(
    (index) => {
      const normalizedIndex = (index + photos.length) % photos.length;
      onSelect(photos[normalizedIndex].uuid);
    },
    [onSelect, photos],
  );

  useEffect(() => {
    if (!selectedPhoto || !canBrowse) return undefined;
    const browseWithKeyboard = (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        selectAt(selectedIndex - 1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        selectAt(selectedIndex + 1);
      }
    };
    window.addEventListener('keydown', browseWithKeyboard);
    return () => window.removeEventListener('keydown', browseWithKeyboard);
  }, [canBrowse, selectAt, selectedIndex, selectedPhoto]);

  return (
    <Modal
      open={Boolean(selectedPhoto)}
      title="Photo du matériel"
      subtitle={selectedPhoto ? `${selectedIndex + 1} sur ${photos.length}` : undefined}
      className="material-photo-viewer-modal"
      onClose={onClose}
    >
      {selectedPhoto && (
        <div className="material-photo-viewer">
          <div className="material-photo-viewer-frame">
            {canBrowse && (
              <button
                className="material-photo-viewer-navigation previous"
                type="button"
                aria-label="Photo précédente"
                onClick={() => selectAt(selectedIndex - 1)}
              >
                <span aria-hidden="true">‹</span>
              </button>
            )}
            <AuthenticatedImage
              className="material-photo-viewer-image"
              fileUuid={selectedPhoto.uuid}
              alt={selectedPhoto.originalName}
            />
            {canBrowse && (
              <button
                className="material-photo-viewer-navigation next"
                type="button"
                aria-label="Photo suivante"
                onClick={() => selectAt(selectedIndex + 1)}
              >
                <span aria-hidden="true">›</span>
              </button>
            )}
          </div>
          <div className="material-photo-viewer-details">
            <p className="mb-0 fw-semibold text-break">{selectedPhoto.originalName}</p>
            <div className="d-flex flex-wrap align-items-center justify-content-center gap-2">
              {selectedPhoto.isPrimary && (
                <span className="status-badge">Photo principale</span>
              )}
              {selectedPhoto.createdAt && (
                <small className="text-body-secondary">
                  Ajoutée le {formatDateTime(selectedPhoto.createdAt)}
                </small>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

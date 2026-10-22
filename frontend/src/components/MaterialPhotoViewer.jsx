import { useCallback, useEffect, useRef, useState } from 'react';
import { formatDateTime } from '../utils/formatters.js';
import { getMaterialPhotoDisplayName } from '../utils/material-photo.js';
import AuthenticatedImage from './AuthenticatedImage.jsx';
import Modal from './Modal.jsx';

function ZoomablePhoto({ photo, onPrevious, onNext }) {
  const [zoom, setZoom] = useState(1);
  const viewportRef = useRef(null);

  useEffect(() => {
    if (zoom === 1 && viewportRef.current) {
      viewportRef.current.scrollLeft = 0;
      viewportRef.current.scrollTop = 0;
    }
  }, [zoom]);

  return (
    <>
      <div className="d-flex flex-wrap align-items-center justify-content-center gap-2">
        <button
          className="btn btn-outline-secondary btn-sm"
          type="button"
          aria-label="Réduire la photo"
          disabled={zoom === 1}
          onClick={() => setZoom((value) => Math.max(1, value - 0.5))}
        >
          −
        </button>
        <output aria-label="Niveau de zoom" aria-live="polite">
          {zoom * 100} %
        </output>
        <button
          className="btn btn-outline-secondary btn-sm"
          type="button"
          aria-label="Agrandir la photo"
          disabled={zoom === 4}
          onClick={() => setZoom((value) => Math.min(4, value + 0.5))}
        >
          +
        </button>
        <button
          className="btn btn-outline-secondary btn-sm"
          type="button"
          disabled={zoom === 1}
          onClick={() => setZoom(1)}
        >
          Ajuster à la fenêtre
        </button>
      </div>
      <div className="material-photo-viewer-frame">
        <div
          ref={viewportRef}
          className="material-photo-viewer-viewport"
          role="region"
          aria-label="Photo agrandie : faites défiler pour explorer les détails"
          tabIndex={0}
          onKeyDown={(event) => {
            if (zoom > 1 && event.key.startsWith('Arrow')) event.stopPropagation();
          }}
        >
          <div className="material-photo-viewer-canvas" data-zoom={zoom * 100}>
            <AuthenticatedImage
              className="material-photo-viewer-image"
              fileUuid={photo.uuid}
              alt={getMaterialPhotoDisplayName(photo)}
            />
          </div>
        </div>
        {onPrevious && (
          <button
            className="material-photo-viewer-navigation previous"
            type="button"
            aria-label="Photo précédente"
            onClick={onPrevious}
          >
            <span aria-hidden="true">‹</span>
          </button>
        )}
        {onNext && (
          <button
            className="material-photo-viewer-navigation next"
            type="button"
            aria-label="Photo suivante"
            onClick={onNext}
          >
            <span aria-hidden="true">›</span>
          </button>
        )}
      </div>
      {zoom > 1 && (
        <small className="text-body-secondary text-center">
          Faites défiler la photo pour explorer les détails.
        </small>
      )}
    </>
  );
}

/** Displays a material photo at full size and lets users browse the material gallery. */
export default function MaterialPhotoViewer({ photos, selectedUuid, onSelect, onClose }) {
  const selectedIndex = photos.findIndex((photo) => photo.uuid === selectedUuid);
  const selectedPhoto = photos[selectedIndex];
  const selectedPhotoName = getMaterialPhotoDisplayName(selectedPhoto);
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
          <ZoomablePhoto
            key={selectedPhoto.uuid}
            photo={selectedPhoto}
            onPrevious={canBrowse ? () => selectAt(selectedIndex - 1) : undefined}
            onNext={canBrowse ? () => selectAt(selectedIndex + 1) : undefined}
          />
          <div className="material-photo-viewer-details">
            <p className="mb-0 fw-semibold text-break">{selectedPhotoName}</p>
            {selectedPhoto.name && (
              <small className="text-body-secondary text-break">
                Fichier : {selectedPhoto.originalName}
              </small>
            )}
            <div className="d-flex flex-wrap align-items-center justify-content-center gap-2">
              {selectedPhoto.isPrimary && <span className="status-badge">Photo principale</span>}
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

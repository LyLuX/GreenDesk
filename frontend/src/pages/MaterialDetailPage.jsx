import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import getApiErrorMessage from '../api/get-api-error-message.js';
import { listMaintenance } from '../api/maintenance.api.js';
import {
  deleteMaterialFile,
  downloadMaterialFile,
  setPrimaryMaterialPhoto,
  uploadMaterialDocument,
  uploadMaterialPhoto,
} from '../api/material-files.api.js';
import { createReferenceApi } from '../api/reference.api.js';
import useAuth from '../auth/useAuth.js';
import AuthenticatedImage from '../components/AuthenticatedImage.jsx';
import Button from '../components/Button.jsx';
import Loader from '../components/Loader.jsx';
import { formatCurrency } from '../utils/formatters.js';

const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const Field = ({ label, value }) => (
  <div>
    <dt>{label}</dt>
    <dd>{value ?? '—'}</dd>
  </div>
);
const formatDate = (value) =>
  value ? new Intl.DateTimeFormat('fr-FR').format(new Date(`${value}T00:00:00Z`)) : '—';
const displayValue = (value) =>
  value === null || value === undefined || value === '' ? '—' : String(value);

/** Detailed material lifecycle view, including protected files and audit history. */
export default function MaterialDetailPage() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [material, setMaterial] = useState(null);
  const [history, setHistory] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [activeTab, setActiveTab] = useState('details');
  const [error, setError] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [documentFile, setDocumentFile] = useState(null);
  const [documentType, setDocumentType] = useState('other');
  const previewsRef = useRef([]);

  const load = useCallback(async () => {
    try {
      const [materialResponse, historyResponse] = await Promise.all([
        createReferenceApi('materials').get(uuid),
        createReferenceApi('materials').get(`${uuid}/history`),
      ]);
      setMaterial(materialResponse.data.data);
      setHistory(historyResponse.data.data ?? []);
      setError('');
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }, [uuid]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!hasPermission('maintenance.read')) return undefined;
    const controller = new AbortController();
    listMaintenance({ materialUuid: uuid }, controller.signal)
      .then((response) => setMaintenance(response.data.data?.items ?? []))
      .catch(() => {});
    return () => controller.abort();
  }, [hasPermission, uuid]);
  useEffect(() => () => previewsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const photos = useMemo(
    () =>
      (material?.files?.filter((file) => file.kind === 'photo') ?? []).sort(
        (a, b) => Number(b.isPrimary) - Number(a.isPrimary),
      ),
    [material],
  );
  const documents = useMemo(
    () => material?.files?.filter((file) => file.kind === 'document') ?? [],
    [material],
  );
  const upload = async (file, document = false, onUploadProgress) => {
    if (file.size > 10 * 1024 * 1024) throw new Error('Le fichier dépasse la limite de 10 Mo.');
    const response = document
      ? await uploadMaterialDocument(uuid, file, documentType, onUploadProgress)
      : await uploadMaterialPhoto(uuid, file, onUploadProgress);
    return response.data.data;
  };
  const setQueuedPhoto = (localId, update) =>
    setSelectedPhotos((items) =>
      items.map((item) => (item.localId === localId ? { ...item, ...update } : item)),
    );
  const queuePhotos = (event) => {
    const files = [...event.target.files];
    const invalid = files.find(
      (file) => !imageTypes.includes(file.type) || file.size > 10 * 1024 * 1024,
    );
    if (invalid) {
      setError('Les photos doivent être au format JPEG, PNG ou WebP et ne pas dépasser 10 Mo.');
      return;
    }
    const items = files.map((file) => ({
      localId: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      progress: 0,
      status: 'pending',
      error: '',
    }));
    selectedPhotos.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    previewsRef.current = items.map((item) => item.previewUrl);
    setSelectedPhotos(items);
  };
  const removeQueuedPhoto = (localId) =>
    setSelectedPhotos((items) => {
      const item = items.find((current) => current.localId === localId);
      if (item) URL.revokeObjectURL(item.previewUrl);
      previewsRef.current = previewsRef.current.filter((url) => url !== item?.previewUrl);
      return items.filter((current) => current.localId !== localId);
    });
  const uploadPhotos = async () => {
    if (photos.length + selectedPhotos.length > 10) {
      setError('Un matériel est limité à 10 photos.');
      return;
    }
    for (const item of selectedPhotos.filter((photo) => photo.status !== 'success')) {
      setQueuedPhoto(item.localId, { status: 'uploading', error: '', progress: 0 });
      try {
        await upload(item.file, false, (event) =>
          setQueuedPhoto(item.localId, {
            progress: Math.round((event.loaded * 100) / (event.total || 1)),
          }),
        );
        setQueuedPhoto(item.localId, { status: 'success', progress: 100 });
      } catch (err) {
        setQueuedPhoto(item.localId, { status: 'error', error: getApiErrorMessage(err) });
      }
    }
    await load();
    setSelectedPhotos((items) => {
      items
        .filter((item) => item.status === 'success')
        .forEach((item) => URL.revokeObjectURL(item.previewUrl));
      const remaining = items.filter((item) => item.status !== 'success');
      previewsRef.current = remaining.map((item) => item.previewUrl);
      return remaining;
    });
  };
  const uploadDocument = async () => {
    if (!documentFile) return;
    try {
      await upload(documentFile, true);
      setDocumentFile(null);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };
  const removeFile = async (file) => {
    if (!window.confirm(`Supprimer « ${file.originalName} » ?`)) return;
    try {
      await deleteMaterialFile(file.uuid);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };
  const download = async (file) => {
    try {
      const response = await downloadMaterialFile(file.uuid);
      const href = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.download = file.originalName;
      anchor.click();
      URL.revokeObjectURL(href);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };
  const changes = (event) => {
    const before = event.oldValues ?? {};
    const after = event.newValues ?? {};
    return Object.keys(after)
      .filter(
        (key) =>
          !['updatedAt', 'createdAt', 'id'].includes(key) &&
          JSON.stringify(before[key]) !== JSON.stringify(after[key]),
      )
      .map((key) => (
        <li key={key}>
          <strong>{key}</strong> : {displayValue(before[key])} → {displayValue(after[key])}
        </li>
      ));
  };
  if (error && !material)
    return (
      <main className="app-page">
        <p role="alert" className="alert alert-danger">
          {error}
        </p>
        <Button onClick={load}>Réessayer</Button>
      </main>
    );
  if (!material)
    return (
      <main className="app-page">
        <Loader label="Chargement du matériel" />
      </main>
    );
  return (
    <main className="app-page">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
        <Link className="btn btn-outline-brand" to="/materials">
          Retour aux matériels
        </Link>
        {hasPermission('materials.update') && (
          <Button onClick={() => navigate(`/materials/${uuid}/edit`)}>Modifier</Button>
        )}
      </div>
      <h1 className="page-title mt-4">{material.name}</h1>
      <p className="mt-2">
        <span className={`status-badge ${material.active ? '' : 'inactive'}`}>
          {material.active ? 'Actif' : 'Inactif'}
        </span>
      </p>
      {error && (
        <p role="alert" className="alert alert-danger mt-3">
          {error}
        </p>
      )}
      <div className="detail-tabs mt-5 d-flex flex-wrap gap-2">
        <button
          className="mr-4 p-2"
          aria-pressed={activeTab === 'details'}
          onClick={() => setActiveTab('details')}
        >
          Informations
        </button>
        <button
          className="p-2"
          aria-pressed={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
        >
          Historique
        </button>
        {hasPermission('maintenance.read') && (
          <button
            className="ml-4 p-2"
            aria-pressed={activeTab === 'maintenance'}
            onClick={() => setActiveTab('maintenance')}
          >
            Maintenance
          </button>
        )}
      </div>
      {activeTab === 'details' ? (
        <>
          <section className="detail-grid mt-5 grid gap-5 p-5 sm:grid-cols-2">
            <Field label="Référence" value={material.reference} />
            <Field label="Marque" value={material.brand?.name} />
            <Field label="Modèle" value={material.model} />
            <Field label="Numéro de série" value={material.serialNumber} />
            <Field label="Année" value={material.year} />
            <Field label="Catégorie" value={material.category?.name} />
            <Field label="Propriété" value={material.property?.name} />
            <Field label="Prix d’achat" value={formatCurrency(material.purchasePrice)} />
            <Field label="Valeur actuelle" value={formatCurrency(material.currentValue)} />
            <Field label="Date d’achat" value={formatDate(material.purchaseDate)} />
            <Field label="Heures moteur" value={material.engineHours} />
            <Field label="Mise en service" value={formatDate(material.commissionedAt)} />
            <Field label="Sortie de service" value={formatDate(material.retiredAt)} />
            <Field label="Notes" value={material.notes} />
          </section>
          <section className="surface mt-5 p-4">
            <h2 className="h4 mb-3">Photos</h2>
            {hasPermission('materials.update') && (
              <>
                <input
                  className="form-control mt-3"
                  aria-label="Ajouter des photos"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={queuePhotos}
                />
                <div className="mt-3 flex flex-wrap gap-3">
                  {selectedPhotos.map((item) => (
                    <article className="surface w-32 p-2" key={item.localId}>
                      <img
                        className="h-24 w-full object-cover"
                        src={item.previewUrl}
                        alt={`Aperçu ${item.file.name}`}
                      />
                      <p className="truncate text-xs">{item.file.name}</p>
                      {item.status === 'uploading' && (
                        <progress className="w-full" value={item.progress} max="100" />
                      )}
                      {item.error && (
                        <p role="alert" className="text-xs text-red-700">
                          {item.error}
                        </p>
                      )}
                      <Button onClick={() => removeQueuedPhoto(item.localId)}>Retirer</Button>
                    </article>
                  ))}
                </div>
                <Button disabled={!selectedPhotos.length} onClick={uploadPhotos}>
                  Envoyer les photos
                </Button>
              </>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {photos.map((file) => (
                <article className="surface p-3" key={file.uuid}>
                  <AuthenticatedImage
                    className="h-40 w-full object-cover"
                    fileUuid={file.uuid}
                    alt={file.originalName}
                  />
                  <p>
                    {file.originalName}
                    {file.isPrimary ? ' (principale)' : ''}
                  </p>
                  {hasPermission('materials.update') && (
                    <div className="mt-2 space-x-2">
                      <Button
                        disabled={file.isPrimary}
                        onClick={async () => {
                          await setPrimaryMaterialPhoto(file.uuid);
                          load();
                        }}
                      >
                        Principale
                      </Button>
                      <Button onClick={() => removeFile(file)}>Supprimer</Button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
          <section className="surface mt-5 p-4">
            <h2 className="h4 mb-3">Documents</h2>
            {hasPermission('materials.update') && (
              <div className="mt-3 flex flex-wrap gap-3">
                <input
                  aria-label="Ajouter un document"
                  className="form-control"
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)}
                />
                <select
                  className="form-select"
                  value={documentType}
                  onChange={(event) => setDocumentType(event.target.value)}
                >
                  <option value="invoice">Facture</option>
                  <option value="manual">Notice</option>
                  <option value="certificate">Certificat</option>
                  <option value="other">Autre</option>
                </select>
                <Button disabled={!documentFile} onClick={uploadDocument}>
                  Envoyer
                </Button>
              </div>
            )}
            <ul className="mt-3">
              {documents.map((file) => (
                <li className="flex gap-3 py-2" key={file.uuid}>
                  <span>
                    {file.originalName} ({file.documentType})
                  </span>
                  <Button onClick={() => download(file)}>Télécharger</Button>
                  {hasPermission('materials.update') && (
                    <Button onClick={() => removeFile(file)}>Supprimer</Button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : activeTab === 'maintenance' ? (
        <section className="surface mt-5 p-4">
          <h2 className="h4 mb-3">Maintenance</h2>
          {maintenance.length === 0 ? (
            <p>Aucun plan d’entretien actif.</p>
          ) : (
            <ul className="list-group">
              {maintenance.map((task) => (
                <li className="list-group-item" key={task.uuid}>
                  <strong>{task.title}</strong> ·{' '}
                  {task.status === 'overdue'
                    ? 'En retard'
                    : task.status === 'upcoming'
                      ? 'À prévoir'
                      : 'À jour'}
                  <span className="ml-3">
                    Échéance : {task.nextMaintenanceDate ?? task.nextEngineHours ?? '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link className="btn btn-outline-brand mt-3" to="/maintenance">
            Voir la maintenance
          </Link>
        </section>
      ) : (
        <section className="surface mt-5 p-4">
          <h2 className="h4 mb-3">Historique</h2>
          {history.length === 0 ? (
            <p>Aucune modification enregistrée.</p>
          ) : (
            <ul className="list-group">
              {history.map((event) => (
                <li className="list-group-item" key={event.uuid}>
                  <p>
                    <strong>{event.action}</strong> · {formatDate(event.createdAt?.slice(0, 10))} ·{' '}
                    {event.user ? `${event.user.firstName} ${event.user.lastName}` : 'Système'}
                  </p>
                  <ul>{changes(event)}</ul>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}

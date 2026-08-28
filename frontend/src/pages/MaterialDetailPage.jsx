import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import getApiErrorMessage from '../api/get-api-error-message.js';
import { listMaintenance, listMaintenanceInterventions } from '../api/maintenance.api.js';
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
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Loader from '../components/Loader.jsx';
import ManufacturerLogo from '../components/ManufacturerLogo.jsx';
import PaginationControls from '../components/PaginationControls.jsx';
import {
  maintenanceStatusClasses,
  maintenanceStatusLabels,
} from '../maintenance/maintenance.labels.js';
import maintenancePermissions from '../maintenance/maintenance.permissions.js';
import { auditValuesAreEqual } from '../history/audit-values.js';
import fleetPermissions from '../permissions/fleet.permissions.js';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatOperationDateTime,
} from '../utils/formatters.js';
import { paginateItems } from '../utils/pagination.js';

const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const documentTypeLabels = Object.freeze({
  invoice: 'Facture',
  manual: 'Notice',
  certificate: 'Certificat',
  exploded_view: 'Vue éclatée',
  parts_list: 'Listing de pièces',
  other: 'Autre',
});
const auditActionLabels = Object.freeze({
  CREATE: 'Création',
  UPDATE: 'Modification',
  RESTORE: 'Restauration',
  DELETE: 'Suppression',
});
const auditActionClasses = Object.freeze({
  CREATE: 'audit-create',
  UPDATE: 'audit-update',
  RESTORE: 'audit-restore',
  DELETE: 'audit-delete',
});
const auditFieldLabels = Object.freeze({
  name: 'Nom',
  description: 'Description',
  unit: 'Unité',
  purchasePrice: 'Prix d’achat',
  manufacturer: 'Fabricant',
  category: 'Catégorie',
  model: 'Modèle',
  serialNumber: 'Numéro de série',
  purchaseDate: 'Date d’achat',
  commissionedAt: 'Mise en service',
  retiredAt: 'Sortie de service',
  notes: 'Notes',
  active: 'Statut',
});
const hiddenAuditFields = new Set([
  'id',
  'uuid',
  'brandId',
  'manufacturerId',
  'categoryId',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'createdBy',
  'updatedBy',
]);
const Field = ({ label, value }) => (
  <tr>
    <th scope="row">{label}</th>
    <td>{value ?? '—'}</td>
  </tr>
);
const displayAuditValue = (key, value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'active') return value ? 'Actif' : 'Inactif';
  if (key === 'purchasePrice') return formatCurrency(value);
  if (['purchaseDate', 'commissionedAt', 'retiredAt'].includes(key)) return formatDate(value);
  if (typeof value === 'object') return value.name ?? JSON.stringify(value);
  return String(value);
};
const eventChanges = (event) => {
  const before = event.oldValues ?? {};
  const after = event.newValues ?? {};
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter(
      (key) => !hiddenAuditFields.has(key) && !auditValuesAreEqual(key, before[key], after[key]),
    )
    .map((key) => ({
      key,
      label: auditFieldLabels[key] ?? key,
      before: displayAuditValue(key, before[key]),
      after: displayAuditValue(key, after[key]),
    }));
};

/** Detailed material lifecycle view, including protected files and audit history. */
export default function MaterialDetailPage() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [material, setMaterial] = useState(null);
  const [history, setHistory] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(5);
  const [historyPagination, setHistoryPagination] = useState(null);
  const [maintenancePage, setMaintenancePage] = useState(1);
  const [maintenanceLimit, setMaintenanceLimit] = useState(5);
  const [maintenancePagination, setMaintenancePagination] = useState(null);
  const [interventions, setInterventions] = useState([]);
  const [interventionPage, setInterventionPage] = useState(1);
  const [interventionLimit, setInterventionLimit] = useState(5);
  const [interventionPagination, setInterventionPagination] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [error, setError] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [documentFile, setDocumentFile] = useState(null);
  const [documentType, setDocumentType] = useState('other');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [removingFileUuid, setRemovingFileUuid] = useState(null);
  const previewsRef = useRef([]);
  const photoSequenceRef = useRef(0);
  const documentInputRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const materialResponse = await createReferenceApi('materials').get(uuid);
      setMaterial(materialResponse.data.data);
      setError('');
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }, [uuid]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const controller = new AbortController();
    createReferenceApi('materials')
      .get(`${uuid}/history`, { page: historyPage, limit: historyLimit }, controller.signal)
      .then((response) => {
        const payload = response.data.data ?? {};
        const normalized = Array.isArray(payload)
          ? paginateItems(payload, historyPage, historyLimit)
          : payload;
        setHistory(normalized.items ?? []);
        setHistoryPagination(normalized.pagination ?? null);
      })
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') setError(getApiErrorMessage(requestError));
      });
    return () => controller.abort();
  }, [historyLimit, historyPage, uuid]);
  useEffect(() => {
    if (!hasPermission(maintenancePermissions.plans.read)) return undefined;
    const controller = new AbortController();
    listMaintenance(
      { materialUuid: uuid, page: maintenancePage, limit: maintenanceLimit },
      controller.signal,
    )
      .then((response) => {
        setMaintenance(response.data.data?.items ?? []);
        setMaintenancePagination(response.data.data?.pagination ?? null);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [hasPermission, maintenanceLimit, maintenancePage, uuid]);
  useEffect(() => {
    if (!hasPermission(maintenancePermissions.plans.read)) return undefined;
    const controller = new AbortController();
    listMaintenanceInterventions(
      { materialUuid: uuid, page: interventionPage, limit: interventionLimit },
      controller.signal,
    )
      .then((response) => {
        setInterventions(response.data.data?.items ?? []);
        setInterventionPagination(response.data.data?.pagination ?? null);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [hasPermission, interventionLimit, interventionPage, uuid]);
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
      event.target.value = '';
      return;
    }
    const items = files.map((file) => ({
      localId: `${Date.now()}-${photoSequenceRef.current++}`,
      file,
      previewUrl: URL.createObjectURL(file),
      progress: 0,
      status: 'pending',
      error: '',
    }));
    selectedPhotos.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    previewsRef.current = items.map((item) => item.previewUrl);
    setSelectedPhotos(items);
    setError('');
    event.target.value = '';
  };
  const removeQueuedPhoto = (localId) =>
    setSelectedPhotos((items) => {
      const item = items.find((current) => current.localId === localId);
      if (item) URL.revokeObjectURL(item.previewUrl);
      previewsRef.current = previewsRef.current.filter((url) => url !== item?.previewUrl);
      return items.filter((current) => current.localId !== localId);
    });
  const uploadPhotos = async () => {
    if (uploadingPhotos) return;
    if (photos.length + selectedPhotos.length > 10) {
      setError('Un matériel est limité à 10 photos.');
      return;
    }
    setUploadingPhotos(true);
    try {
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
    } finally {
      setUploadingPhotos(false);
    }
  };
  const uploadDocument = async () => {
    if (!documentFile || uploadingDocument) return;
    setUploadingDocument(true);
    try {
      await upload(documentFile, true);
      setDocumentFile(null);
      if (documentInputRef.current) documentInputRef.current.value = '';
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setUploadingDocument(false);
    }
  };
  const removeFile = async (file) => {
    if (removingFileUuid) return false;
    setRemovingFileUuid(file.uuid);
    try {
      await deleteMaterialFile(file.uuid);
      await load();
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err));
      return false;
    } finally {
      setRemovingFileUuid(null);
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
        {hasPermission(fleetPermissions.materials.update) && (
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
      <div className="detail-tabs mt-4 d-flex flex-wrap gap-2" role="tablist">
        <button
          className="p-2"
          role="tab"
          aria-pressed={activeTab === 'details'}
          onClick={() => setActiveTab('details')}
        >
          Informations
        </button>
        <button
          className="p-2"
          role="tab"
          aria-pressed={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
        >
          Historique
        </button>
        {hasPermission(maintenancePermissions.plans.read) && (
          <button
            className="p-2"
            role="tab"
            aria-pressed={activeTab === 'maintenance'}
            onClick={() => setActiveTab('maintenance')}
          >
            Maintenance
          </button>
        )}
      </div>
      {activeTab === 'details' ? (
        <>
          <section className="mt-4" aria-labelledby="material-information-title">
            <h2 className="h4 mb-3" id="material-information-title">
              Informations
            </h2>
            <div className="table-shell table-responsive">
              <table className="table detail-table align-middle">
                <tbody>
                  <Field
                    label="Fabricant"
                    value={
                      material.manufacturer ? (
                        <ManufacturerLogo manufacturer={material.manufacturer} />
                      ) : null
                    }
                  />
                  <Field label="Modèle" value={material.model} />
                  <Field label="Numéro de série" value={material.serialNumber} />
                  <Field label="Catégorie" value={material.category?.name} />
                  <Field label="Unité" value={material.unit} />
                  <Field label="Prix d’achat" value={formatCurrency(material.purchasePrice)} />
                  <Field label="Date d’achat" value={formatDate(material.purchaseDate)} />
                  <Field label="Mise en service" value={formatDate(material.commissionedAt)} />
                  <Field label="Sortie de service" value={formatDate(material.retiredAt)} />
                  <Field label="Notes" value={material.notes} />
                </tbody>
              </table>
            </div>
          </section>
          <section className="surface mt-5 p-4">
            <h2 className="h4 mb-3">Photos</h2>
            {hasPermission(fleetPermissions.materials.photos.create) && (
              <div className="material-file-upload">
                <input
                  className="form-control"
                  aria-label="Ajouter des photos"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={queuePhotos}
                />
                {selectedPhotos.length > 0 && (
                  <div className="material-photo-queue">
                    {selectedPhotos.map((item) => (
                      <article className="material-photo-queue-item surface p-2" key={item.localId}>
                        <img
                          className="material-photo-queue-preview"
                          src={item.previewUrl}
                          alt={`Aperçu ${item.file.name}`}
                        />
                        <p className="material-file-name">{item.file.name}</p>
                        {item.status === 'uploading' && (
                          <progress
                            className="material-file-progress"
                            value={item.progress}
                            max="100"
                          />
                        )}
                        {item.error && (
                          <p role="alert" className="material-file-error">
                            {item.error}
                          </p>
                        )}
                        <Button
                          type="button"
                          disabled={uploadingPhotos}
                          onClick={() => removeQueuedPhoto(item.localId)}
                        >
                          Retirer
                        </Button>
                      </article>
                    ))}
                  </div>
                )}
                <Button
                  type="button"
                  disabled={!selectedPhotos.length || uploadingPhotos}
                  onClick={uploadPhotos}
                >
                  {uploadingPhotos ? 'Envoi en cours…' : 'Envoyer les photos'}
                </Button>
              </div>
            )}
            <div className="material-photo-grid mt-4">
              {photos.map((file) => (
                <article className="surface p-3" key={file.uuid}>
                  <AuthenticatedImage
                    className="material-photo-image"
                    fileUuid={file.uuid}
                    alt={file.originalName}
                  />
                  <p>
                    {file.originalName}
                    {file.isPrimary ? ' (principale)' : ''}
                  </p>
                  {(hasPermission(fleetPermissions.materials.photos.setPrimary) ||
                    hasPermission(fleetPermissions.materials.files.delete)) && (
                    <div className="material-photo-actions mt-2">
                      {hasPermission(fleetPermissions.materials.photos.setPrimary) && (
                        <Button
                          type="button"
                          disabled={file.isPrimary}
                          onClick={async () => {
                            await setPrimaryMaterialPhoto(file.uuid);
                            load();
                          }}
                        >
                          Principale
                        </Button>
                      )}
                      {hasPermission(fleetPermissions.materials.files.delete) && (
                        <Button
                          type="button"
                          disabled={removingFileUuid === file.uuid}
                          onClick={() => setFileToDelete(file)}
                        >
                          Supprimer
                        </Button>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
          <section className="surface mt-5 p-4">
            <h2 className="h4 mb-3">Documents</h2>
            {hasPermission(fleetPermissions.materials.documents.create) && (
              <div className="material-file-upload">
                <input
                  ref={documentInputRef}
                  aria-label="Ajouter un document"
                  className="form-control"
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file && (file.type !== 'application/pdf' || file.size > 10 * 1024 * 1024)) {
                      setDocumentFile(null);
                      setError('Le document doit être un fichier PDF de 10 Mo maximum.');
                      event.target.value = '';
                      return;
                    }
                    setDocumentFile(file);
                    setError('');
                  }}
                />
                <select
                  className="form-select"
                  aria-label="Type de document"
                  value={documentType}
                  onChange={(event) => setDocumentType(event.target.value)}
                >
                  <option value="invoice">Facture</option>
                  <option value="manual">Notice</option>
                  <option value="certificate">Certificat</option>
                  <option value="exploded_view">Vue éclatée</option>
                  <option value="parts_list">Listing de pièces</option>
                  <option value="other">Autre</option>
                </select>
                {documentFile && (
                  <small className="text-body-secondary">
                    Fichier sélectionné : {documentFile.name}
                  </small>
                )}
                <Button
                  type="button"
                  disabled={!documentFile || uploadingDocument}
                  onClick={uploadDocument}
                >
                  {uploadingDocument ? 'Envoi en cours…' : 'Envoyer le document'}
                </Button>
              </div>
            )}
            {documents.length > 0 ? (
              <div className="table-shell table-responsive mt-4">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>Type</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((file) => (
                      <tr key={file.uuid}>
                        <td>{file.originalName}</td>
                        <td>{documentTypeLabels[file.documentType] ?? 'Autre'}</td>
                        <td>
                          <div className="d-flex flex-wrap gap-2">
                            <Button type="button" onClick={() => download(file)}>
                              Télécharger
                            </Button>
                            {hasPermission(fleetPermissions.materials.files.delete) && (
                              <Button
                                type="button"
                                disabled={removingFileUuid === file.uuid}
                                onClick={() => setFileToDelete(file)}
                              >
                                Supprimer
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mb-0 mt-4 text-body-secondary">Aucun document ajouté.</p>
            )}
          </section>
        </>
      ) : activeTab === 'maintenance' ? (
        <section className="mt-4">
          <h2 className="h4 mb-3">Maintenance</h2>
          {maintenance.length === 0 ? (
            <div className="surface p-4">
              <p className="mb-0 text-body-secondary">Aucun plan d’entretien actif.</p>
            </div>
          ) : (
            <div className="table-shell table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Échéance</th>
                    <th>État</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenance.map((task) => (
                    <tr key={task.uuid}>
                      <td>{task.title}</td>
                      <td>
                        {task.status === 'wearBased'
                          ? 'Selon l’usure'
                          : formatDate(task.nextMaintenanceDate)}
                      </td>
                      <td>
                        <span
                          className={`status-badge ${maintenanceStatusClasses[task.status] ?? ''}`}
                        >
                          {maintenanceStatusLabels[task.status] ?? maintenanceStatusLabels.upToDate}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <PaginationControls
            pagination={maintenancePagination}
            limit={maintenanceLimit}
            itemLabel="plan(s) d’entretien"
            onLimitChange={(value) => {
              setMaintenanceLimit(value);
              setMaintenancePage(1);
            }}
            onPageChange={setMaintenancePage}
          />
          <Link
            className="btn btn-outline-brand mt-3"
            to={`/maintenance?materialUuid=${encodeURIComponent(uuid)}`}
          >
            Voir la maintenance
          </Link>
          <h3 className="h5 mb-3 mt-5">Interventions ponctuelles</h3>
          {interventions.length === 0 ? (
            <p className="text-body-secondary">Aucune intervention ponctuelle enregistrée.</p>
          ) : (
            <div className="table-shell table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Date et heure</th>
                    <th>Description</th>
                    <th>Pièces utilisées</th>
                    <th>Coût</th>
                    <th>Utilisateur</th>
                  </tr>
                </thead>
                <tbody>
                  {interventions.map((intervention) => (
                    <tr key={intervention.uuid}>
                      <td>
                        {formatOperationDateTime(intervention.performedAt, intervention.createdAt)}
                      </td>
                      <td>{intervention.description}</td>
                      <td>
                        {(intervention.parts ?? [])
                          .map((part) => `${part.name} (${part.quantity} ${part.unit})`)
                          .join(', ')}
                      </td>
                      <td>{formatCurrency(intervention.totalCost)}</td>
                      <td>
                        {intervention.performedByUser
                          ? `${intervention.performedByUser.firstName} ${intervention.performedByUser.lastName}`
                          : 'Utilisateur supprimé'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <PaginationControls
            pagination={interventionPagination}
            limit={interventionLimit}
            itemLabel="intervention(s) ponctuelle(s)"
            onLimitChange={(value) => {
              setInterventionLimit(value);
              setInterventionPage(1);
            }}
            onPageChange={setInterventionPage}
          />
        </section>
      ) : (
        <section className="mt-4">
          <h2 className="h4 mb-3">Historique</h2>
          {history.length === 0 ? (
            <div className="surface p-4">
              <p className="mb-0 text-body-secondary">Aucune modification enregistrée.</p>
            </div>
          ) : (
            <div className="table-shell table-responsive">
              <table className="table history-table align-middle">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Action</th>
                    <th>Utilisateur</th>
                    <th>Modifications</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((event) => {
                    const changes = eventChanges(event);
                    return (
                      <tr key={event.uuid}>
                        <td>{formatDateTime(event.createdAt)}</td>
                        <td>
                          <span
                            className={`status-badge ${auditActionClasses[event.action] ?? ''}`}
                          >
                            {auditActionLabels[event.action] ?? event.action}
                          </span>
                        </td>
                        <td>
                          {event.user
                            ? `${event.user.firstName} ${event.user.lastName}`
                            : 'Système'}
                        </td>
                        <td>
                          {changes.length > 0 ? (
                            <ul className="history-changes">
                              {changes.map((change) => (
                                <li key={change.key}>
                                  <strong>{change.label}</strong>
                                  <span>{change.before}</span>
                                  <span aria-hidden="true">→</span>
                                  <span>{change.after}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-body-secondary">Aucun changement de valeur</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <PaginationControls
            pagination={historyPagination}
            limit={historyLimit}
            itemLabel="événement(s)"
            onLimitChange={(value) => {
              setHistoryLimit(value);
              setHistoryPage(1);
            }}
            onPageChange={setHistoryPage}
          />
        </section>
      )}
      <ConfirmDialog
        open={Boolean(fileToDelete)}
        title={fileToDelete?.kind === 'photo' ? 'Supprimer la photo' : 'Supprimer le document'}
        description={`« ${fileToDelete?.originalName ?? ''} » sera supprimé de ce matériel.`}
        confirmLabel="Supprimer"
        onClose={() => !removingFileUuid && setFileToDelete(null)}
        onConfirm={async () => {
          if (fileToDelete && (await removeFile(fileToDelete))) setFileToDelete(null);
        }}
        busy={Boolean(removingFileUuid)}
      />
    </main>
  );
}

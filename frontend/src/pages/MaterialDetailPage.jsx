import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import getApiErrorMessage from '../api/get-api-error-message.js';
import {
  deleteMaterialFile,
  downloadMaterialFile,
  setPrimaryMaterialPhoto,
  uploadMaterialDocument,
  uploadMaterialPhoto,
} from '../api/material-files.api.js';
import { createReferenceApi } from '../api/reference.api.js';
import useAuth from '../auth/useAuth.js';
import Button from '../components/Button.jsx';
import { formatCurrency } from '../utils/formatters.js';

const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const Field = ({ label, value }) => (
  <div>
    <dt className="text-sm text-slate-500">{label}</dt>
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
  const [activeTab, setActiveTab] = useState('details');
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState({});
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [documentFile, setDocumentFile] = useState(null);
  const [documentType, setDocumentType] = useState('other');

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
  useEffect(
    () => () => selectedPhotos.forEach((item) => URL.revokeObjectURL(item.preview)),
    [selectedPhotos],
  );

  const photos = useMemo(
    () => material?.files?.filter((file) => file.kind === 'photo') ?? [],
    [material],
  );
  const documents = useMemo(
    () => material?.files?.filter((file) => file.kind === 'document') ?? [],
    [material],
  );
  const upload = async (file, document = false) => {
    if (file.size > 10 * 1024 * 1024) throw new Error('Le fichier dépasse la limite de 10 Mo.');
    const response = document
      ? await uploadMaterialDocument(uuid, file, documentType, (event) =>
          setUploadProgress((current) => ({
            ...current,
            [file.name]: Math.round((event.loaded * 100) / (event.total || 1)),
          })),
        )
      : await uploadMaterialPhoto(uuid, file, (event) =>
          setUploadProgress((current) => ({
            ...current,
            [file.name]: Math.round((event.loaded * 100) / (event.total || 1)),
          })),
        );
    return response.data.data;
  };
  const uploadPhotos = async () => {
    if (photos.length + selectedPhotos.length > 10) {
      setError('Un matériel est limité à 10 photos.');
      return;
    }
    try {
      await Promise.all(selectedPhotos.map((item) => upload(item.file)));
      setSelectedPhotos([]);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
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
      <main className="p-6">
        <p role="alert">{error}</p>
        <Button onClick={load}>Réessayer</Button>
      </main>
    );
  if (!material) return <main className="p-6">Chargement du matériel…</main>;
  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/materials">Retour aux matériels</Link>
        {hasPermission('materials.update') && (
          <Button onClick={() => navigate('/materials')}>Modifier</Button>
        )}
      </div>
      <h1 className="mt-4 text-2xl font-semibold">{material.name}</h1>
      <p>{material.active ? 'Actif' : 'Inactif'}</p>
      {error && (
        <p role="alert" className="mt-3 text-red-700">
          {error}
        </p>
      )}
      <div className="mt-6 border-b">
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
      </div>
      {activeTab === 'details' ? (
        <>
          <section className="mt-6 grid gap-5 rounded border bg-white p-5 sm:grid-cols-2">
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
          <section className="mt-6">
            <h2 className="text-xl font-semibold">Photos</h2>
            {hasPermission('materials.update') && (
              <>
                <input
                  className="mt-3"
                  aria-label="Ajouter des photos"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(event) =>
                    setSelectedPhotos(
                      [...event.target.files].map((file) => ({
                        file,
                        preview: URL.createObjectURL(file),
                      })),
                    )
                  }
                />
                <div className="mt-3 flex flex-wrap gap-3">
                  {selectedPhotos.map((item) => (
                    <img
                      className="h-24 w-24 object-cover"
                      key={item.preview}
                      src={item.preview}
                      alt={`Aperçu ${item.file.name}`}
                    />
                  ))}
                </div>
                <Button disabled={!selectedPhotos.length} onClick={uploadPhotos}>
                  Envoyer les photos
                </Button>
              </>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {photos.map((file) => (
                <article className="border p-3" key={file.uuid}>
                  <p>
                    {file.originalName}
                    {file.isPrimary ? ' (principale)' : ''}
                  </p>
                  {uploadProgress[file.originalName] && (
                    <progress value={uploadProgress[file.originalName]} max="100" />
                  )}
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
          <section className="mt-6">
            <h2 className="text-xl font-semibold">Documents</h2>
            {hasPermission('materials.update') && (
              <div className="mt-3 flex flex-wrap gap-3">
                <input
                  aria-label="Ajouter un document"
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)}
                />
                <select
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
      ) : (
        <section className="mt-6">
          <h2 className="text-xl font-semibold">Historique</h2>
          {history.length === 0 ? (
            <p>Aucune modification enregistrée.</p>
          ) : (
            <ul className="divide-y border">
              {history.map((event) => (
                <li className="p-3" key={event.uuid}>
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

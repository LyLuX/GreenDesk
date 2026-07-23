import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import getApiErrorMessage from '../api/get-api-error-message.js';
import { createReferenceApi } from '../api/reference.api.js';
import { formatCurrency } from '../utils/formatters.js';

const Field = ({ label, value }) => (
  <div>
    <dt className="text-sm text-slate-500">{label}</dt>
    <dd>{value ?? '—'}</dd>
  </div>
);
export default function MaterialDetailPage() {
  const { uuid } = useParams();
  const [material, setMaterial] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const response = await createReferenceApi('materials').get(uuid);
      setMaterial(response.data.data);
      setError('');
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }, [uuid]);
  useEffect(() => {
    load();
  }, [load]);
  if (error)
    return (
      <main className="p-6">
        <p role="alert">{error}</p>
        <button onClick={load}>Réessayer</button>
      </main>
    );
  if (!material) return <main className="p-6">Chargement du matériel…</main>;
  return (
    <main className="mx-auto max-w-5xl p-6">
      <Link to="/materials">Retour aux matériels</Link>
      <h1 className="mt-4 text-2xl font-semibold">{material.name}</h1>
      <p>{material.active ? 'Actif' : 'Inactif'}</p>
      <section className="mt-6 grid gap-5 rounded border bg-white p-5 sm:grid-cols-2">
        <Field label="Référence" value={material.reference} />
        <Field label="Marque" value={material.brand?.name} />
        <Field label="Modèle" value={material.model} />
        <Field label="Numéro de série" value={material.serialNumber} />
        <Field label="Catégorie" value={material.category?.name} />
        <Field label="Propriété" value={material.property?.name} />
        <Field label="Prix d’achat" value={formatCurrency(material.purchasePrice)} />
        <Field label="Valeur actuelle" value={formatCurrency(material.currentValue)} />
        <Field label="Date d’achat" value={material.purchaseDate} />
        <Field label="Heures moteur" value={material.engineHours} />
        <Field label="Mise en service" value={material.commissionedAt} />
        <Field label="Sortie de service" value={material.retiredAt} />
        <Field label="Notes" value={material.notes} />
      </section>
      <section className="mt-6">
        <h2 className="text-xl font-semibold">Fichiers</h2>
        <ul>
          {(material.files ?? []).map((file) => (
            <li key={file.uuid}>{file.originalName}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { getDashboardSummary } from '../api/dashboard.api.js';
import getApiErrorMessage from '../api/get-api-error-message.js';
export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try {
      const response = await getDashboardSummary();
      const next = response.data?.data;
      if (!next || typeof next !== 'object')
        throw new Error('Réponse du tableau de bord invalide.');
      setData(next);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }, []);
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
  if (!data) return <main className="p-6">Chargement du tableau de bord…</main>;
  const materials = data.materials ?? {};
  const categories = data.categories ?? {};
  const properties = data.properties ?? {};
  const cards = [
    ['Matériaux', materials.total ?? 0],
    ['Matériaux actifs', materials.active ?? 0],
    ['Matériaux inactifs', materials.inactive ?? 0],
    ['Catégories', categories.total ?? 0],
    ['Propriétés', properties.total ?? 0],
  ];
  return (
    <main className="p-6">
      <h1 className="mb-5 text-2xl font-semibold">Tableau de bord</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value]) => (
          <section className="rounded border bg-white p-4" key={label}>
            <p className="text-sm text-slate-600">{label}</p>
            <strong className="text-3xl">{value}</strong>
          </section>
        ))}
      </div>
    </main>
  );
}

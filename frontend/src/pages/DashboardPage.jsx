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
      setData(response.data.data);
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
  const cards = [
    ['Matériaux', data.materials.total],
    ['Matériaux actifs', data.materials.active],
    ['Matériaux inactifs', data.materials.inactive],
    ['Catégories', data.categories.total],
    ['Propriétés', data.properties.total],
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

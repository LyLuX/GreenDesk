import { useCallback, useEffect, useState } from 'react';
import { getDashboardSummary } from '../api/dashboard.api.js';
import getApiErrorMessage from '../api/get-api-error-message.js';
import { formatCurrency } from '../utils/formatters.js';
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
      <main className="loading-page d-grid place-items-center">
        <div className="status-panel surface p-4 text-center">
          <p role="alert" className="text-danger mb-3">
            {error}
          </p>
          <button className="btn btn-brand" type="button" onClick={load}>
            Réessayer
          </button>
        </div>
      </main>
    );
  if (!data)
    return (
      <main className="loading-page d-grid place-items-center">
        <p className="text-body-secondary" role="status">
          Chargement du tableau de bord…
        </p>
      </main>
    );
  const materials = data.materials ?? {};
  const categories = data.categories ?? {};
  const properties = data.properties ?? {};
  const brands = data.brands ?? {};
  const fleet = data.fleet ?? {};
  const maintenance = data.maintenance ?? {};
  const cards = [
    ['Matériaux', materials.total ?? 0],
    ['Matériaux actifs', materials.active ?? 0],
    ['Matériaux inactifs', materials.inactive ?? 0],
    ['Catégories', categories.total ?? 0],
    ['Propriétés', properties.total ?? 0],
    ['Marques', brands.total ?? 0],
    ['Valeur du parc', formatCurrency(fleet.totalValue)],
    ['Coût moyen', formatCurrency(fleet.averageCost)],
    ['Âge moyen', `${Number(fleet.averageAge ?? 0).toFixed(1)} ans`],
    ['Entretiens aujourd’hui', maintenance.today ?? 0],
    ['Entretiens en retard', maintenance.overdue ?? 0],
    ['Entretiens réalisés ce mois', maintenance.completedThisMonth ?? 0],
    ['Entretiens prévus sous 30 jours', maintenance.upcoming ?? 0],
  ];
  return (
    <main className="app-page">
      <div className="page-header">
        <h1 className="page-title">Tableau de bord</h1>
        <p className="page-subtitle">Vue d’ensemble du parc matériel et des opérations à suivre.</p>
      </div>
      <div className="row justify-content-evenly g-3">
        {cards.map(([label, value]) => (
          <div className="col-sm-6 col-xl-4" key={label}>
            <section className="metric-card h-100 p-4">
              <p className="metric-label mb-2">{label}</p>
              <strong className="metric-value">{value}</strong>
            </section>
          </div>
        ))}
      </div>
    </main>
  );
}

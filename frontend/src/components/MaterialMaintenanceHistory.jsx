import { useEffect, useState } from 'react';
import { listMaterialMaintenanceHistory } from '../api/maintenance.api.js';
import getApiErrorMessage from '../api/get-api-error-message.js';
import { formatOperationDateTime } from '../utils/formatters.js';
import Button from './Button.jsx';
import Loader from './Loader.jsx';
import PaginationControls from './PaginationControls.jsx';
import {
  maintenanceHistoryClass,
  MaintenanceExecutionBadge,
  MaintenanceExecutionParts,
} from './MaintenanceHistoryDetails.jsx';

export default function MaterialMaintenanceHistory({ materialUuid }) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [result, setResult] = useState({ items: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    listMaterialMaintenanceHistory({ materialUuid, page, limit }, controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) setResult(response.data.data);
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [materialUuid, page, limit, attempt]);

  return (
    <section className="mt-5" aria-labelledby="material-maintenance-history-title">
      <h3 className="h5 mb-3" id="material-maintenance-history-title">
        Historique des plans de maintenance
      </h3>
      {loading ? (
        <Loader label="Chargement de l’historique des plans de maintenance" />
      ) : error ? (
        <div>
          <p role="alert" className="alert alert-danger">
            {error}
          </p>
          <Button onClick={() => setAttempt((value) => value + 1)}>Réessayer</Button>
        </div>
      ) : result.items.length === 0 ? (
        <p className="text-body-secondary">Aucun entretien enregistré.</p>
      ) : (
        <div className="table-shell table-responsive overflow-auto">
          <table className="table table-hover align-middle maintenance-history-table">
            <thead>
              <tr>
                <th scope="col">Date et heure</th>
                <th scope="col">Plan</th>
                <th scope="col">Commentaire</th>
                <th scope="col">Remplacement des pièces</th>
                <th scope="col">Utilisateur</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((entry) => (
                <tr key={entry.uuid} className={maintenanceHistoryClass(entry.executionType)}>
                  <td>{formatOperationDateTime(entry.performedAt, entry.createdAt)}</td>
                  <td>{entry.task?.title ?? '—'}</td>
                  <td>{entry.comment || 'Sans commentaire'}</td>
                  <td>
                    <MaintenanceExecutionBadge executionType={entry.executionType} />
                    <MaintenanceExecutionParts entry={entry} compact />
                    {!maintenanceHistoryClass(entry.executionType) &&
                      !entry.partsSnapshot?.length &&
                      '—'}
                  </td>
                  <td>
                    {entry.performedByUser
                      ? `${entry.performedByUser.firstName} ${entry.performedByUser.lastName}`
                      : 'Utilisateur supprimé'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!error && (
        <PaginationControls
          pagination={result.pagination}
          limit={limit}
          disabled={loading}
          itemLabel="entretien(s)"
          onLimitChange={(value) => {
            setLimit(value);
            setPage(1);
          }}
          onPageChange={setPage}
        />
      )}
    </section>
  );
}

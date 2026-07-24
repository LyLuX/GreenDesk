import StatusPanel from '../components/StatusPanel.jsx';

export default function ForbiddenPage() {
  return (
    <main className="status-page d-grid place-items-center">
      <StatusPanel>
        <h1 className="page-title">Accès refusé</h1>
        <p className="page-subtitle">Vous n’avez pas l’autorisation d’accéder à cette page.</p>
      </StatusPanel>
    </main>
  );
}

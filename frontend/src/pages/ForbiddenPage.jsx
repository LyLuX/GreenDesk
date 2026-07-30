import StatusPanel from '../components/StatusPanel.jsx';

export default function ForbiddenPage() {
  return (
    <main className="status-page d-grid align-items-center justify-content-center">
      <StatusPanel showDashboardLink>
        <h1 className="page-title">Accès refusé</h1>
        <p className="page-subtitle">Vous n’avez pas l’autorisation d’accéder à cette page.</p>
      </StatusPanel>
    </main>
  );
}

import StatusPanel from '../components/StatusPanel.jsx';

export default function NotFoundPage() {
  return (
    <main className="status-page d-grid align-items-center justify-content-center">
      <StatusPanel showDashboardLink>
        <h1 className="page-title">Page introuvable</h1>
        <p className="page-subtitle">Cette adresse ne correspond à aucune page GreenDesk.</p>
      </StatusPanel>
    </main>
  );
}

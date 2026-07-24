import StatusPanel from '../components/StatusPanel.jsx';

export default function NotFoundPage() {
  return (
    <main className="status-page d-grid place-items-center">
      <StatusPanel>
        <h1 className="page-title">Page introuvable</h1>
        <p className="page-subtitle">Cette adresse ne correspond à aucune page GreenDesk.</p>
      </StatusPanel>
    </main>
  );
}

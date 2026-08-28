export default function PrintableBrandHeader({ companyName }) {
  return (
    <header className="maintenance-order-print-header">
      <div className="maintenance-order-print-brand">
        <img className="brand-logo" src="/brand-logo.jpg" alt="EI BOURNAZEL Paul" />
        <span>
          <span className="brand-name d-block">GreenDesk</span>
          <span className="brand-company d-block">{companyName ?? 'Aucune société'}</span>
        </span>
      </div>
    </header>
  );
}

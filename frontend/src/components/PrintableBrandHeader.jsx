import CompanyLogo from './CompanyLogo.jsx';

export default function PrintableBrandHeader({ company }) {
  return (
    <header className="maintenance-order-print-header">
      <div className="maintenance-order-print-brand">
        <CompanyLogo company={company} className="brand-logo" fallbackSrc="/brand-logo.jpg" />
        <span>
          <span className="brand-name d-block">GreenDesk</span>
          <span className="brand-company d-block">{company?.name ?? 'Aucune société'}</span>
        </span>
      </div>
    </header>
  );
}

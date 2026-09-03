import CompanyLogo from './CompanyLogo.jsx';

export default function PrintableBrandHeader({ company }) {
  return (
    <header className="maintenance-order-print-header">
      <div className="maintenance-order-print-brand">
        <CompanyLogo company={company} className="brand-logo" />
        <span>
          {company?.hasLogo && <span className="brand-name d-block">GreenDesk</span>}
          <span className="brand-company d-block">{company?.name ?? 'Aucune société'}</span>
        </span>
      </div>
    </header>
  );
}

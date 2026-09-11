import { useEffect, useRef, useState } from 'react';

export default function CompanySwitcher({ companies, activeCompany, onSelect }) {
  const [isOpen, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const choicesRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  if (companies.length <= 1) {
    return <span className="brand-company d-block">{activeCompany?.name ?? 'Aucune société'}</span>;
  }

  return (
    <div
      className="company-switcher"
      ref={containerRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="company-switcher-trigger brand-company"
        aria-label={`Changer de société : ${activeCompany?.name ?? 'Aucune société'}`}
        aria-expanded={isOpen}
        aria-controls="company-choices"
        title={activeCompany?.name}
        onClick={() => setOpen((open) => !open)}
      >
        <span>{activeCompany?.name ?? 'Aucune société'}</span>
        <span aria-hidden="true">▾</span>
      </button>
      <div
        id="company-choices"
        ref={choicesRef}
        className="company-switcher-options dropdown-menu"
        data-open={isOpen}
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <p className="dropdown-header">Changer de société</p>
        {companies.map((company) => (
          <button
            key={company.uuid}
            type="button"
            tabIndex={isOpen ? 0 : -1}
            className="dropdown-item d-flex align-items-center gap-2"
            aria-current={company.uuid === activeCompany?.uuid ? 'true' : undefined}
            onClick={() => {
              setOpen(false);
              triggerRef.current?.focus();
              if (company.uuid !== activeCompany?.uuid) onSelect(company.uuid);
            }}
          >
            <span className="company-switcher-check" aria-hidden="true">
              {company.uuid === activeCompany?.uuid ? '✓' : ''}
            </span>
            <span>{company.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

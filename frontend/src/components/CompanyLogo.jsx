import { getCompanyLogo } from '../api/company-logo.api.js';
import AuthenticatedImage from './AuthenticatedImage.jsx';

/** Displays an accessible company's protected logo or the requested fallback. */
export default function CompanyLogo({ company, className = 'brand-thumbnail', fallbackSrc }) {
  if (!company?.hasLogo) {
    if (fallbackSrc) {
      return <img className={className} src={fallbackSrc} alt="Logo GreenDesk" />;
    }
    return (
      <span className={`${className} brand-thumbnail-placeholder`} aria-label="Aucun logo">
        —
      </span>
    );
  }
  return (
    <AuthenticatedImage
      fileUuid={company.uuid}
      cacheKey={`${company.uuid}:${company.updatedAt ?? ''}`}
      loadImage={getCompanyLogo}
      className={className}
      alt={`Logo ${company.name}`}
    />
  );
}

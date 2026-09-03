import { getCompanyLogo } from '../api/company-logo.api.js';
import AuthenticatedImage from './AuthenticatedImage.jsx';

/** Displays an accessible company's protected logo or the requested fallback. */
export default function CompanyLogo({
  company,
  className = 'brand-thumbnail',
  fallbackSrc = '/logo-greendesk.jpg',
}) {
  if (!company?.hasLogo) {
    return <img className={className} src={fallbackSrc} alt="Logo GreenDesk" />;
  }
  return (
    <AuthenticatedImage
      fileUuid={company.uuid}
      cacheKey={`${company.uuid}:${company.updatedAt ?? ''}`}
      loadImage={getCompanyLogo}
      className={className}
      alt={`Logo ${company.name}`}
      fallbackSrc={fallbackSrc}
      fallbackAlt="Logo GreenDesk"
    />
  );
}

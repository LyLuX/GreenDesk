import { getBrandLogo } from '../api/brand-logo.api.js';
import AuthenticatedImage from './AuthenticatedImage.jsx';

/** Displays a protected brand logo as a compact illustration. */
export default function BrandLogo({ brand, className = 'brand-thumbnail' }) {
  if (!brand?.hasLogo) {
    return (
      <span className={`${className} brand-thumbnail-placeholder`} aria-label="Aucun logo">
        —
      </span>
    );
  }
  return (
    <AuthenticatedImage
      fileUuid={brand.uuid}
      loadImage={getBrandLogo}
      className={className}
      alt={`Logo ${brand.name}`}
    />
  );
}

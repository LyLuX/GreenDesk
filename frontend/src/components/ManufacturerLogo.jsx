import { getManufacturerLogo } from '../api/manufacturer-logo.api.js';
import AuthenticatedImage from './AuthenticatedImage.jsx';

/** Displays a protected manufacturer logo as a compact illustration. */
export default function ManufacturerLogo({ manufacturer, className = 'brand-thumbnail' }) {
  if (!manufacturer?.hasLogo) {
    return (
      <span className={`${className} brand-thumbnail-placeholder`} aria-label="Aucun logo">
        —
      </span>
    );
  }
  return (
    <AuthenticatedImage
      fileUuid={manufacturer.uuid}
      loadImage={getManufacturerLogo}
      className={className}
      alt={`Logo ${manufacturer.name}`}
    />
  );
}

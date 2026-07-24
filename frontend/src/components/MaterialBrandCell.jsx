import BrandLogo from './BrandLogo.jsx';

/** Uses the brand logo in material tables, with its name as the fallback. */
export default function MaterialBrandCell({ brand }) {
  if (!brand) return '—';
  if (!brand.hasLogo) return brand.name;

  return <BrandLogo brand={brand} />;
}

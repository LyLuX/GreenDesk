import ManufacturerLogo from './ManufacturerLogo.jsx';

/** Uses the manufacturer logo in material tables, with its name as the fallback. */
export default function MaterialManufacturerCell({ manufacturer }) {
  if (!manufacturer) return '—';
  if (!manufacturer.hasLogo) return manufacturer.name;

  return <ManufacturerLogo manufacturer={manufacturer} />;
}

import ManufacturerLogo from './ManufacturerLogo.jsx';

/** Uses the manufacturer logo in material tables without displaying its name. */
export default function MaterialManufacturerCell({ manufacturer }) {
  if (!manufacturer) return '—';
  return <ManufacturerLogo manufacturer={manufacturer} />;
}

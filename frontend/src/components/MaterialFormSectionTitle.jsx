const sectionTitles = {
  name: 'Identification',
  purchaseDate: 'Cycle de vie',
  notes: 'Informations complémentaires',
  unit: 'Unité et valorisation',
};

/** Keeps material creation and editing sections visually consistent. */
export default function MaterialFormSectionTitle({ fieldName }) {
  const title = sectionTitles[fieldName];
  return title ? <h3 className="form-section-title">{title}</h3> : null;
}

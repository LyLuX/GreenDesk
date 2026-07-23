import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import getApiErrorMessage from '../api/get-api-error-message.js';
import { createReferenceApi } from '../api/reference.api.js';
import Button from '../components/Button.jsx';
import FormField from '../components/FormField.jsx';
import normalizeFormValues from '../utils/normalize-form-values.js';

const fields = [
  { name: 'name', label: 'Nom', required: true },
  { name: 'reference', label: 'Référence' },
  { name: 'brandUuid', label: 'Marque' },
  { name: 'categoryUuid', label: 'Catégorie' },
  { name: 'propertyUuid', label: 'Propriété' },
  { name: 'model', label: 'Modèle' },
  { name: 'serialNumber', label: 'Numéro de série' },
  { name: 'year', label: 'Année', type: 'number', valueType: 'number', min: '1900' },
  { name: 'purchaseDate', label: 'Date d’achat', type: 'date' },
  { name: 'commissionedAt', label: 'Mise en service', type: 'date' },
  { name: 'retiredAt', label: 'Sortie de service', type: 'date' },
  { name: 'unit', label: 'Unité', required: true },
  {
    name: 'purchasePrice',
    label: 'Prix d’achat',
    type: 'number',
    valueType: 'number',
    step: '0.01',
    min: '0',
    required: true,
  },
  {
    name: 'salePrice',
    label: 'Prix de vente',
    type: 'number',
    valueType: 'number',
    step: '0.01',
    min: '0',
    required: true,
  },
  {
    name: 'currentValue',
    label: 'Valeur actuelle',
    type: 'number',
    valueType: 'number',
    step: '0.01',
    min: '0',
  },
  {
    name: 'engineHours',
    label: 'Heures moteur',
    type: 'number',
    valueType: 'number',
    step: '0.1',
    min: '0',
  },
  { name: 'notes', label: 'Notes', multiline: true },
];

const dateIsCoherent = (values) => {
  const purchase = values.purchaseDate && new Date(`${values.purchaseDate}T00:00:00Z`);
  const commissioned = values.commissionedAt && new Date(`${values.commissionedAt}T00:00:00Z`);
  const retired = values.retiredAt && new Date(`${values.retiredAt}T00:00:00Z`);
  if (purchase && commissioned && purchase > commissioned)
    return 'La mise en service ne peut pas précéder la date d’achat.';
  if (commissioned && retired && commissioned > retired)
    return 'La sortie de service ne peut pas précéder la mise en service.';
  return '';
};

/** Dedicated edit route so a material can be amended from its detail view. */
export default function MaterialEditPage() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [material, setMaterial] = useState(null);
  const [options, setOptions] = useState({ brands: [], categories: [], properties: [] });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    try {
      const [item, brands, categories, properties] = await Promise.all([
        createReferenceApi('materials').get(uuid),
        createReferenceApi('brands').list(),
        createReferenceApi('categories').list(),
        createReferenceApi('properties').list(),
      ]);
      setMaterial(item.data.data);
      setOptions({
        brands: brands.data.data ?? [],
        categories: categories.data.data ?? [],
        properties: properties.data.data ?? [],
      });
      setError('');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }, [uuid]);
  useEffect(() => {
    load();
  }, [load]);
  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    const values = normalizeFormValues(
      Object.fromEntries(new FormData(event.currentTarget)),
      fields,
    );
    const dateError = dateIsCoherent(values);
    if (dateError) {
      setError(dateError);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createReferenceApi('materials').update(uuid, values);
      navigate(`/materials/${uuid}`);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };
  if (!material)
    return (
      <main className="app-page text-body-secondary" role="status">
        Chargement du formulaire…
      </main>
    );
  const relationOptions = (items) => items.map((item) => ({ value: item.uuid, label: item.name }));
  return (
    <main className="app-page">
      <Link className="btn btn-outline-brand" to={`/materials/${uuid}`}>
        Retour à la fiche
      </Link>
      <h1 className="page-title mt-4">Modifier {material.name}</h1>
      <form className="surface mt-4 d-grid gap-4 p-4" onSubmit={submit}>
        {error && (
          <p role="alert" className="alert alert-danger mb-0">
            {error}
          </p>
        )}
        {fields.map((field) => (
          <FormField
            key={field.name}
            {...field}
            defaultValue={
              material[field.name] ?? material[field.name.replace('Uuid', '')]?.uuid ?? ''
            }
            options={
              field.name === 'brandUuid'
                ? relationOptions(options.brands)
                : field.name === 'categoryUuid'
                  ? relationOptions(options.categories)
                  : field.name === 'propertyUuid'
                    ? relationOptions(options.properties)
                    : undefined
            }
          />
        ))}
        <Button type="submit" disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </form>
    </main>
  );
}

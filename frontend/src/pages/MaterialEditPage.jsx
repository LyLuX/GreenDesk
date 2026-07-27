import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import getApiErrorMessage from '../api/get-api-error-message.js';
import { createReferenceApi } from '../api/reference.api.js';
import Button from '../components/Button.jsx';
import FormField from '../components/FormField.jsx';
import Loader from '../components/Loader.jsx';
import normalizeFormValues from '../utils/normalize-form-values.js';

const fields = [
  { name: 'name', label: 'Nom', required: true },
  { name: 'manufacturerUuid', label: 'Fabricant' },
  { name: 'categoryUuid', label: 'Catégorie' },
  { name: 'model', label: 'Modèle' },
  { name: 'serialNumber', label: 'Numéro de série' },
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
  const [options, setOptions] = useState({ manufacturers: [], categories: [] });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    try {
      const [item, manufacturers, categories] = await Promise.all([
        createReferenceApi('materials').get(uuid),
        createReferenceApi('manufacturers').list(),
        createReferenceApi('categories').list(),
      ]);
      setMaterial(item.data.data);
      setOptions({
        manufacturers: manufacturers.data.data ?? [],
        categories: categories.data.data ?? [],
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
      <main className="app-page">
        <Loader label="Chargement du formulaire" />
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
              field.name === 'manufacturerUuid'
                ? relationOptions(options.manufacturers)
                : field.name === 'categoryUuid'
                  ? relationOptions(options.categories)
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

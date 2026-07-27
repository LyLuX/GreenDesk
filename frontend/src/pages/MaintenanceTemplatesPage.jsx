import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import getApiErrorMessage from '../api/get-api-error-message.js';
import {
  createMaintenanceTemplate,
  deleteMaintenanceTemplate,
  listMaintenanceTemplates,
  updateMaintenanceTemplate,
} from '../api/maintenance-template.api.js';
import { createReferenceApi } from '../api/reference.api.js';
import useAuth from '../auth/useAuth.js';
import Button from '../components/Button.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import FormField from '../components/FormField.jsx';
import Loader from '../components/Loader.jsx';
import Modal from '../components/Modal.jsx';
import {
  maintenancePriorityLabels,
  maintenanceTypeLabels,
} from '../maintenance/maintenance.labels.js';
import useNotification from '../notifications/useNotification.js';
import normalizeFormValues from '../utils/normalize-form-values.js';

const fields = [
  { name: 'materialUuid', label: 'Matériel de référence', required: true },
  { name: 'title', label: 'Intitulé', required: true },
  { name: 'description', label: 'Description', multiline: true },
  { name: 'maintenanceType', label: 'Type', required: true },
  {
    name: 'intervalDays',
    label: 'Intervalle (jours)',
    type: 'number',
    valueType: 'number',
    min: '1',
    required: true,
  },
  { name: 'priority', label: 'Priorité' },
  { name: 'partReference', label: 'Référence de pièce ou consommable' },
  {
    name: 'quantity',
    label: 'Quantité',
    type: 'number',
    valueType: 'number',
    min: '1',
  },
  { name: 'instructions', label: 'Consignes spécifiques', multiline: true },
];

export default function MaintenanceTemplatesPage() {
  const { hasPermission } = useAuth();
  const { notify } = useNotification();
  const [templates, setTemplates] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const load = useCallback(async (signal) => {
    setIsLoading(true);
    try {
      const [templateResponse, materialResponse] = await Promise.all([
        listMaintenanceTemplates({}, signal),
        createReferenceApi('materials').list({ limit: 'all' }, signal),
      ]);
      setTemplates(templateResponse.data.data ?? []);
      setMaterials(materialResponse.data.data?.items ?? materialResponse.data.data ?? []);
      setError('');
    } catch (requestError) {
      if (requestError.code !== 'ERR_CANCELED') setError(getApiErrorMessage(requestError));
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const close = () => {
    if (!busy) {
      setDialog(null);
      setFormError('');
    }
  };
  const materialForTemplate = (template) =>
    materials.find(
      (material) =>
        material.brand?.uuid === template?.brand?.uuid &&
        material.model?.trim().toLocaleLowerCase('fr-FR') ===
          template?.materialModel?.trim().toLocaleLowerCase('fr-FR'),
    );
  const optionsFor = (field) => {
    if (field.name === 'materialUuid')
      return materials
        .filter((material) => material.brand?.uuid && material.model)
        .map((material) => ({
          value: material.uuid,
          label: `${material.brand.name} ${material.model} — ${material.name}`,
        }));
    if (field.name === 'maintenanceType')
      return Object.entries(maintenanceTypeLabels).map(([value, label]) => ({ value, label }));
    if (field.name === 'priority')
      return Object.entries(maintenancePriorityLabels).map(([value, label]) => ({ value, label }));
    return undefined;
  };
  const defaultFor = (field) => {
    if (field.name === 'materialUuid') return materialForTemplate(dialog?.item)?.uuid ?? '';
    return dialog?.item?.[field.name] ?? '';
  };
  const save = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setFormError('');
    try {
      const payload = normalizeFormValues(
        Object.fromEntries(new FormData(event.currentTarget)),
        fields,
      );
      if (dialog.type === 'edit') await updateMaintenanceTemplate(dialog.item.uuid, payload);
      else await createMaintenanceTemplate(payload);
      notify(
        'success',
        dialog.type === 'edit' ? 'Modèle d’entretien modifié.' : 'Modèle d’entretien créé.',
      );
      close();
      await load();
    } catch (requestError) {
      setFormError(getApiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!confirmation || busy) return;
    setBusy(true);
    try {
      await deleteMaintenanceTemplate(confirmation.uuid);
      notify('success', 'Modèle d’entretien supprimé.');
      setConfirmation(null);
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="app-page">
      <div className="page-header d-flex flex-wrap align-items-start justify-content-between gap-3">
        <div>
          <Link className="btn btn-outline-brand mb-3" to="/maintenance">
            Retour à la maintenance
          </Link>
          <h1 className="page-title">Modèles d’entretien</h1>
          <p className="page-subtitle">
            Références et périodicités propres à une marque et un modèle de matériel.
          </p>
        </div>
        {hasPermission('maintenance.create') && (
          <Button onClick={() => setDialog({ type: 'create' })}>Créer un modèle</Button>
        )}
      </div>
      {error && (
        <p role="alert" className="alert alert-danger">
          {error}
        </p>
      )}
      {isLoading ? (
        <Loader label="Chargement des modèles d’entretien" />
      ) : (
        <div className="table-shell table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Matériel compatible</th>
                <th>Entretien</th>
                <th>Périodicité</th>
                <th>Référence</th>
                <th>Priorité</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-5 text-center">
                    Aucun modèle d’entretien.
                  </td>
                </tr>
              ) : (
                templates.map((template) => (
                  <tr key={template.uuid}>
                    <td>
                      {template.brand?.name} {template.materialModel}
                    </td>
                    <td>
                      <strong>{template.title}</strong>
                      <br />
                      {maintenanceTypeLabels[template.maintenanceType]}
                    </td>
                    <td>{template.intervalDays} jours</td>
                    <td>
                      {template.partReference
                        ? `${template.partReference}${
                            template.quantity ? ` × ${template.quantity}` : ''
                          }`
                        : '—'}
                    </td>
                    <td>{maintenancePriorityLabels[template.priority]}</td>
                    <td>
                      <div className="d-flex gap-2">
                        {hasPermission('maintenance.update') && (
                          <button
                            className="btn btn-sm btn-outline-brand"
                            type="button"
                            onClick={() => setDialog({ type: 'edit', item: template })}
                          >
                            Modifier
                          </button>
                        )}
                        {hasPermission('maintenance.delete') && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            type="button"
                            onClick={() => setConfirmation(template)}
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      <Modal
        open={Boolean(dialog)}
        title={dialog?.type === 'edit' ? 'Modifier le modèle' : 'Créer un modèle'}
        onClose={close}
        busy={busy}
      >
        <form key={dialog?.item?.uuid ?? 'create'} className="d-grid gap-3" onSubmit={save}>
          {formError && (
            <p role="alert" className="alert alert-danger mb-0">
              {formError}
            </p>
          )}
          {fields.map((field) => (
            <FormField
              key={field.name}
              {...field}
              defaultValue={defaultFor(field)}
              options={optionsFor(field)}
            />
          ))}
          <Button type="submit" disabled={busy}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>
      </Modal>
      <ConfirmDialog
        open={Boolean(confirmation)}
        title="Supprimer le modèle d’entretien"
        description={`Le modèle « ${confirmation?.title ?? ''} » sera supprimé s’il n’est affecté à aucun matériel.`}
        confirmLabel="Supprimer"
        onClose={() => !busy && setConfirmation(null)}
        onConfirm={remove}
        busy={busy}
        destructive
      />
    </main>
  );
}

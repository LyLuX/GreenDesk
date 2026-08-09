import { useCallback, useEffect, useState } from 'react';

import getApiErrorMessage from '../api/get-api-error-message.js';
import {
  createMaintenancePart,
  deleteMaintenancePart,
  listMaintenanceParts,
  updateMaintenancePart,
} from '../api/maintenance.api.js';
import { createReferenceApi } from '../api/reference.api.js';
import Button from '../components/Button.jsx';
import Loader from '../components/Loader.jsx';
import ManufacturerLogo from '../components/ManufacturerLogo.jsx';
import StockStatusBadge from '../components/StockStatusBadge.jsx';
import StockManagementModal from '../components/StockManagementModal.jsx';
import { formatStockQuantity } from '../inventory/stock-status.js';
import maintenancePermissions from '../maintenance/maintenance.permissions.js';
import MaintenanceCatalogPage from './MaintenanceCatalogPage.jsx';

const directoryOptions = (items) =>
  items.map((item) => ({
    value: item.uuid,
    label: `${item.name}${item.active ? '' : ' (inactif)'}`,
    disabled: !item.active,
  }));

/** Dedicated exact maintenance-part management page. */
export default function MaintenancePartsPage() {
  const [manufacturers, setManufacturers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [stockDialog, setStockDialog] = useState(null);

  const loadDirectories = useCallback(async (signal) => {
    setIsLoading(true);
    try {
      const [manufacturerResponse, supplierResponse] = await Promise.all([
        createReferenceApi('manufacturers').list({}, signal),
        createReferenceApi('suppliers').list({}, signal),
      ]);
      setManufacturers(manufacturerResponse.data.data ?? []);
      setSuppliers(supplierResponse.data.data ?? []);
      setError('');
    } catch (requestError) {
      if (requestError.code !== 'ERR_CANCELED') setError(getApiErrorMessage(requestError));
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadDirectories(controller.signal);
    return () => controller.abort();
  }, [loadDirectories]);

  if (isLoading) {
    return (
      <main className="app-page">
        <Loader label="Chargement des fabricants et fournisseurs" />
      </main>
    );
  }
  if (error) {
    return (
      <main className="app-page">
        <div
          role="alert"
          className="alert alert-danger d-flex align-items-center justify-content-between"
        >
          <p className="mb-0">{error}</p>
          <Button onClick={() => loadDirectories()}>Réessayer</Button>
        </div>
      </main>
    );
  }

  const fields = [
    { name: 'name', label: 'Désignation', required: true, suggestionsFromRecords: true },
    {
      name: 'manufacturerUuid',
      label: 'Fabricant',
      options: directoryOptions(manufacturers),
    },
    { name: 'reference', label: 'Référence fabricant', required: true },
    {
      name: 'supplierUuid',
      label: 'Fournisseur',
      options: directoryOptions(suppliers),
    },
    { name: 'supplierReference', label: 'Référence fournisseur' },
    { name: 'unit', label: 'Unité', required: true, defaultValue: 'pièce' },
  ];
  const manufacturerByUuid = new Map(
    manufacturers.map((manufacturer) => [manufacturer.uuid, manufacturer]),
  );

  return (
    <>
      <MaintenanceCatalogPage
        title="Pièces de maintenance"
        subtitle="Références exactes à associer aux plans et à commander"
        singular="Pièce"
        singularWithArticle="la pièce"
        fields={fields}
        columns={[
          { key: 'name', label: 'Désignation' },
          {
            key: 'manufacturer',
            label: 'Fabricant',
            render: (_value, part) => (
              <ManufacturerLogo manufacturer={manufacturerByUuid.get(part.manufacturerUuid)} />
            ),
          },
          { key: 'reference', label: 'Référence' },
          { key: 'supplier', label: 'Fournisseur' },
          {
            key: 'stockStatus',
            label: 'Stock',
            render: (value) => <StockStatusBadge status={value} />,
          },
          {
            key: 'quantityOnHand',
            label: 'En stock',
            render: (value, part) => formatStockQuantity(value, part.unit),
          },
          {
            key: 'quantityOnOrder',
            label: 'Commandée',
            render: (value, part) => formatStockQuantity(value, part.unit),
          },
        ]}
        listItems={listMaintenanceParts}
        createItem={createMaintenancePart}
        updateItem={updateMaintenancePart}
        deleteItem={deleteMaintenancePart}
        permissions={maintenancePermissions.parts}
        compactTable
        renderRowActions={(part, { reload }) => (
          <button
            type="button"
            className="btn btn-sm btn-outline-brand me-1"
            aria-label={`Gérer le stock de ${part.name}`}
            onClick={() => setStockDialog({ part, reload })}
          >
            Stock
          </button>
        )}
      />
      {stockDialog ? (
        <StockManagementModal
          part={stockDialog.part}
          onClose={() => setStockDialog(null)}
          onUpdated={() => stockDialog.reload()}
        />
      ) : null}
    </>
  );
}

import { maintenanceExecutionTypeLabels } from '../maintenance/maintenance.labels.js';

export function maintenanceHistoryClass(executionType) {
  if (executionType === 'withoutPartReplacement') return 'maintenance-history-without-parts';
  if (executionType === 'partialPartReplacement') return 'maintenance-history-partial-parts';
  return '';
}

export function MaintenanceExecutionBadge({ executionType }) {
  if (!maintenanceExecutionTypeLabels[executionType]) return null;
  return (
    <span
      className={`status-badge ${executionType === 'partialPartReplacement' ? 'maintenance-history-partial' : 'maintenance-history-exception'}`}
    >
      {maintenanceExecutionTypeLabels[executionType]}
    </span>
  );
}

export function MaintenanceExecutionParts({ entry, compact = false }) {
  if (!entry.partsSnapshot?.length) return null;
  if (compact) {
    return entry.partsSnapshot.map((part, index) => (
      <small className="d-block text-body-secondary" key={part.uuid ?? index}>
        {part.name} x{' '}
        {entry.executionType === 'withoutPartReplacement' || part.consumed === false
          ? 0
          : part.quantity}
      </small>
    ));
  }
  if (!maintenanceExecutionTypeLabels[entry.executionType]) return null;
  const consumed = entry.partsSnapshot.filter((part) => part.consumed);
  const retained = entry.partsSnapshot.filter((part) => !part.consumed);
  const formatParts = (parts) => parts.map((part) => `${part.name} × ${part.quantity}`).join(', ');
  return (
    <>
      {consumed.length > 0 && (
        <small className="d-block text-body-secondary">
          Pièces remplacées : {formatParts(consumed)}
        </small>
      )}
      {retained.length > 0 && (
        <small className="d-block text-body-secondary">
          Pièces non remplacées : {formatParts(retained)}
        </small>
      )}
    </>
  );
}

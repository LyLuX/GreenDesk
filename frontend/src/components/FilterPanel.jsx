import { useId } from 'react';
import DatePicker from './DatePicker.jsx';

const MAX_FIELDS = 6;

/** Shared responsive panel for one search field and up to five list filters. */
export default function FilterPanel({
  fields,
  className = '',
  ariaLabel = 'Recherche et filtres',
}) {
  const idPrefix = useId();
  const searchFields = fields.filter((field) => field.type === 'search');

  if (fields.length > MAX_FIELDS) {
    throw new Error(`Un panneau de filtres ne peut pas contenir plus de ${MAX_FIELDS} champs.`);
  }
  if (searchFields.length > 1) {
    throw new Error('Un panneau de filtres ne peut contenir qu’un seul champ de recherche.');
  }

  return (
    <section aria-label={ariaLabel} className={`filter-panel surface mb-1 p-3 ${className}`.trim()}>
      {fields.map((field) => {
        const id = `${idPrefix}-${field.name}`;
        const isSelect = field.type === 'select';
        const Input = field.type === 'date' ? DatePicker : 'input';
        const Wrapper = field.type === 'date' ? 'div' : 'label';

        return (
          <Wrapper
            className="form-label mb-0 text-body-secondary"
            key={field.name}
            htmlFor={field.type === 'date' ? undefined : id}
          >
            {field.type === 'date' ? (
              <label htmlFor={id}>{field.label}</label>
            ) : field.type === 'search' ? (
              'Recherche'
            ) : (
              field.label
            )}
            {isSelect ? (
              <select
                aria-label={field.ariaLabel}
                className="form-select"
                id={id}
                name={field.name}
                value={field.value}
                onChange={(event) => field.onChange(event.target.value)}
              >
                {field.emptyLabel !== undefined && <option value="">{field.emptyLabel}</option>}
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                {...(field.type === 'date' ? { label: field.label } : {})}
                aria-label={field.ariaLabel}
                className="form-control"
                id={id}
                name={field.name}
                type={field.type ?? 'text'}
                placeholder={field.placeholder}
                value={field.value}
                onChange={(event) => field.onChange(event.target.value)}
              />
            )}
          </Wrapper>
        );
      })}
    </section>
  );
}

import { useId } from 'react';
export default function FormField({ label, error, ...props }) {
  const id = useId();
  const errorId = `${id}-error`;
  const { options, multiline, ...inputProps } = props;
  const controlProps = {
    id,
    'aria-describedby': error ? errorId : undefined,
    'aria-invalid': Boolean(error),
    className: options ? 'form-select' : 'form-control',
    ...inputProps,
  };
  return (
    <label className="form-label mb-0 text-body-secondary" htmlFor={id}>
      {label}
      {multiline ? (
        <textarea {...controlProps} />
      ) : options ? (
        <select {...controlProps}>
          <option value="">Aucune sélection</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input {...controlProps} />
      )}
      {error && (
        <span id={errorId} role="alert" className="d-block mt-1 text-danger small">
          {error}
        </span>
      )}
    </label>
  );
}

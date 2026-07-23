import { useId } from 'react';
export default function FormField({ label, error, ...props }) {
  const id = useId();
  const errorId = `${id}-error`;
  const { options, multiline, ...inputProps } = props;
  const controlProps = {
    id,
    'aria-describedby': error ? errorId : undefined,
    'aria-invalid': Boolean(error),
    className: 'rounded border border-slate-300 px-3 py-2',
    ...inputProps,
  };
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
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
        <span id={errorId} role="alert" className="text-red-700">
          {error}
        </span>
      )}
    </label>
  );
}

import { useId } from 'react';
export default function FormField({ label, error, ...props }) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <input
        id={id}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className="rounded border border-slate-300 px-3 py-2"
        {...props}
      />
      {error && (
        <span id={errorId} role="alert" className="text-red-700">
          {error}
        </span>
      )}
    </label>
  );
}

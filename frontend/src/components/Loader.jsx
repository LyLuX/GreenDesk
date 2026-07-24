/** Displays the shared accessible GreenDesk loading indicator. */
export default function Loader({ label = 'Chargement', size = 'md', className = '' }) {
  return (
    <div
      className={`app-loader app-loader-${size} ${className}`}
      role="status"
      aria-label={label}
      aria-live="polite"
    >
      <span className="app-loader-indicator" aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </div>
  );
}

import { useState } from 'react';

const EyeIcon = ({ hidden }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path
      d={
        hidden
          ? 'M3 3l18 18M10.6 12.7a2 2 0 002.7 2.7M9.9 6.2A10.8 10.8 0 0112 6c5.5 0 9 6 9 6a16.8 16.8 0 01-2.1 2.5M6.6 8.6C4.3 10.1 3 12 3 12s3.5 5 9 5a10.8 10.8 0 004.1-.8'
          : 'M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5zm9 3a3 3 0 100-6 3 3 0 000 6z'
      }
    />
  </svg>
);

/** Password field with an accessible visibility toggle. */
export default function PasswordInput({ className = '', ...props }) {
  const [visible, setVisible] = useState(false);
  const label = visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe';

  return (
    <div className={`input-group password-input ${className}`}>
      <input {...props} className="form-control" type={visible ? 'text' : 'password'} />
      <button
        aria-label={label}
        aria-pressed={visible}
        className="btn btn-outline-secondary password-visibility-toggle"
        type="button"
        onClick={() => setVisible((current) => !current)}
      >
        <EyeIcon hidden={visible} />
      </button>
    </div>
  );
}

import { useState } from 'react';
import EyeIcon from './EyeIcon.jsx';

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

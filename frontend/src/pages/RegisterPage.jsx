import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import client from '../api/client.js';
import getApiErrorMessage from '../api/get-api-error-message.js';
import useAuth from '../auth/useAuth.js';
import PasswordInput from '../components/PasswordInput.jsx';

/** Creates a user account through the public authentication endpoint. */
export default function RegisterPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    passwordConfirmation: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const updateValue = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (loading) return;

    const firstName = values.firstName.trim();
    const lastName = values.lastName.trim();
    const email = values.email.trim();
    if (!firstName || !lastName || !email || !values.password) {
      setError('Tous les champs sont obligatoires.');
      return;
    }
    if (values.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (values.password !== values.passwordConfirmation) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await client.post('/v1/auth/register', {
        firstName,
        lastName,
        email,
        password: values.password,
      });
      navigate('/verify-email', {
        replace: true,
        state: {
          email,
          emailSent: response.data?.data?.verificationEmailSent !== false,
          resendCooldownSeconds: response.data?.data?.verificationEmailResendCooldownSeconds ?? 0,
        },
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page d-flex align-items-center justify-content-center">
      <form className="auth-card card d-grid gap-3 p-4 p-sm-5" onSubmit={submit}>
        <div className="mb-2 text-center">
          <img className="auth-logo mb-3" src="/logo-greendesk.jpg" alt="Logo GreenDesk" />
          <h1 className="auth-heading mb-0">Créer un compte</h1>
        </div>
        {error && (
          <p role="alert" className="alert alert-danger py-2">
            {error}
          </p>
        )}
        <label className="form-label" htmlFor="firstName">
          Prénom
          <input
            id="firstName"
            className="form-control mt-1"
            name="firstName"
            value={values.firstName}
            onChange={updateValue}
            autoComplete="given-name"
            required
            autoFocus
          />
        </label>
        <label className="form-label" htmlFor="lastName">
          Nom
          <input
            id="lastName"
            className="form-control mt-1"
            name="lastName"
            value={values.lastName}
            onChange={updateValue}
            autoComplete="family-name"
            required
          />
        </label>
        <label className="form-label" htmlFor="email">
          Email
          <input
            id="email"
            className="form-control mt-1"
            name="email"
            type="email"
            value={values.email}
            onChange={updateValue}
            autoComplete="email"
            required
          />
        </label>
        <div>
          <label className="form-label" htmlFor="password">
            Mot de passe
          </label>
          <PasswordInput
            id="password"
            name="password"
            value={values.password}
            onChange={updateValue}
            autoComplete="new-password"
            minLength="8"
            required
          />
        </div>
        <div>
          <label className="form-label" htmlFor="passwordConfirmation">
            Confirmer le mot de passe
          </label>
          <PasswordInput
            id="passwordConfirmation"
            name="passwordConfirmation"
            value={values.passwordConfirmation}
            onChange={updateValue}
            autoComplete="new-password"
            minLength="8"
            required
          />
        </div>
        <button className="btn btn-brand w-100 py-2" disabled={loading}>
          {loading ? 'Création…' : 'Créer mon compte'}
        </button>
        <p className="mb-0 text-center small text-body-secondary">
          Déjà un compte ?{' '}
          <Link className="fw-semibold" to="/login">
            Se connecter
          </Link>
        </p>
      </form>
    </main>
  );
}

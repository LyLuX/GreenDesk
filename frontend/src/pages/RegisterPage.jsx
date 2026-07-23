import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import client from '../api/client.js';
import getApiErrorMessage from '../api/get-api-error-message.js';
import useAuth from '../auth/useAuth.js';

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
      await client.post('/v1/auth/register', {
        firstName,
        lastName,
        email,
        password: values.password,
      });
      navigate('/login', {
        replace: true,
        state: { message: 'Votre compte a été créé. Vous pouvez maintenant vous connecter.' },
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-4">
      <form className="grid w-full max-w-sm gap-4 rounded bg-white p-6 shadow" onSubmit={submit}>
        <div>
          <h1 className="text-2xl font-semibold">Créer un compte</h1>
          <p className="text-sm text-slate-600">GreenDesk</p>
        </div>
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
        <label htmlFor="firstName">
          Prénom
          <input
            id="firstName"
            className="mt-1 w-full border p-2"
            name="firstName"
            value={values.firstName}
            onChange={updateValue}
            autoComplete="given-name"
            required
            autoFocus
          />
        </label>
        <label htmlFor="lastName">
          Nom
          <input
            id="lastName"
            className="mt-1 w-full border p-2"
            name="lastName"
            value={values.lastName}
            onChange={updateValue}
            autoComplete="family-name"
            required
          />
        </label>
        <label htmlFor="email">
          Email
          <input
            id="email"
            className="mt-1 w-full border p-2"
            name="email"
            type="email"
            value={values.email}
            onChange={updateValue}
            autoComplete="email"
            required
          />
        </label>
        <label htmlFor="password">
          Mot de passe
          <input
            id="password"
            className="mt-1 w-full border p-2"
            name="password"
            type="password"
            value={values.password}
            onChange={updateValue}
            autoComplete="new-password"
            minLength="8"
            required
          />
        </label>
        <label htmlFor="passwordConfirmation">
          Confirmer le mot de passe
          <input
            id="passwordConfirmation"
            className="mt-1 w-full border p-2"
            name="passwordConfirmation"
            type="password"
            value={values.passwordConfirmation}
            onChange={updateValue}
            autoComplete="new-password"
            minLength="8"
            required
          />
        </label>
        <button className="bg-emerald-700 p-2 text-white disabled:opacity-50" disabled={loading}>
          {loading ? 'Création…' : 'Créer mon compte'}
        </button>
        <p className="text-sm text-slate-600">
          Déjà un compte ?{' '}
          <Link className="text-emerald-700 underline" to="/login">
            Se connecter
          </Link>
        </p>
      </form>
    </main>
  );
}

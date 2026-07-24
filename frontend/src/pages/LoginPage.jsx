import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../auth/useAuth.js';
import getApiErrorMessage from '../api/get-api-error-message.js';
export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  const submit = async (event) => {
    event.preventDefault();
    if (!email || !password || loading) {
      setError('Saisissez votre adresse email et votre mot de passe.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate(location.state?.from || '/dashboard', { replace: true });
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
          <img className="auth-logo mb-3" src="/auth-logo.jpg" alt="EI BOURNAZEL Paul" />
          <h1 className="auth-heading mb-1">GreenDesk</h1>
          <p className="mb-0 text-body-secondary">Connexion à votre espace de travail</p>
        </div>
        {location.state?.message && (
          <p role="status" className="alert alert-success py-2">
            {location.state.message}
          </p>
        )}
        {error && (
          <p role="alert" className="alert alert-danger py-2">
            {error}
          </p>
        )}
        <label className="form-label" htmlFor="login-email">
          Email
          <input
            id="login-email"
            className="form-control mt-1"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </label>
        <label className="form-label" htmlFor="login-password">
          Mot de passe
          <input
            id="login-password"
            className="form-control mt-1"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        <button className="btn btn-brand align-self-center px-4" disabled={loading}>
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
        <p className="mb-0 text-center small text-body-secondary">
          Pas encore de compte ?{' '}
          <Link className="fw-semibold" to="/register">
            Créer un compte
          </Link>
        </p>
      </form>
    </main>
  );
}

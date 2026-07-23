import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
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
    <main className="grid min-h-screen place-items-center bg-slate-100 p-4">
      <form className="grid w-full max-w-sm gap-4 rounded bg-white p-6 shadow" onSubmit={submit}>
        <div>
          <h1 className="text-2xl font-semibold">GreenDesk</h1>
          <p className="text-sm text-slate-600">Connexion à votre espace de travail</p>
        </div>
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
        <label>
          Email
          <input
            className="mt-1 w-full border p-2"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </label>
        <label>
          Mot de passe
          <input
            className="mt-1 w-full border p-2"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        <button className="bg-emerald-700 p-2 text-white disabled:opacity-50" disabled={loading}>
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </main>
  );
}

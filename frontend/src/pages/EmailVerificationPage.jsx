import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';

import { resendEmailVerification, verifyEmail } from '../api/email-verification.api.js';
import getApiErrorMessage, { getRetryAfterSeconds } from '../api/get-api-error-message.js';
import useAuth from '../auth/useAuth.js';
import Loader from '../components/Loader.jsx';
import TimedProgressButton, {
  createTimedCooldown,
  isTimedCooldownActive,
} from '../components/TimedProgressButton.jsx';

/** Public account-verification and safe resend screen. */
export default function EmailVerificationPage() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const attemptedToken = useRef('');
  const [email, setEmail] = useState(location.state?.email ?? '');
  const initialDeliveryFailed = !token && location.state?.emailSent === false;
  const [status, setStatus] = useState(
    token ? 'verifying' : initialDeliveryFailed ? 'delivery-failed' : 'pending',
  );
  const [message, setMessage] = useState(
    initialDeliveryFailed
      ? 'Votre compte est créé, mais l’email de vérification n’a pas pu être envoyé.'
      : '',
  );
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(() =>
    location.state?.emailSent ? createTimedCooldown(location.state?.resendCooldownSeconds) : null,
  );

  useEffect(() => {
    if (!token || attemptedToken.current === token) return;
    attemptedToken.current = token;
    setStatus('verifying');
    verifyEmail(token)
      .then(() => {
        setStatus('verified');
        setMessage('Votre adresse email est vérifiée. Vous pouvez maintenant vous connecter.');
      })
      .catch((error) => {
        setStatus('invalid');
        setMessage(getApiErrorMessage(error));
      });
  }, [token]);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const resend = async (event) => {
    event.preventDefault();
    if (!email.trim() || resending || isTimedCooldownActive(resendCooldown)) return;
    setResending(true);
    setMessage('');
    try {
      const response = await resendEmailVerification(email.trim());
      setResendCooldown(createTimedCooldown(response.data?.data?.resendCooldownSeconds));
      setStatus('resent');
      setMessage(
        'Si un compte non vérifié correspond à cette adresse, un nouvel email a été envoyé.',
      );
    } catch (error) {
      const retryAfterSeconds = getRetryAfterSeconds(error);
      if (retryAfterSeconds) {
        setResendCooldown(createTimedCooldown(retryAfterSeconds));
      }
      setStatus('invalid');
      setMessage(getApiErrorMessage(error));
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="auth-page d-flex align-items-center justify-content-center">
      <section className="auth-card card d-grid gap-3 p-4 p-sm-5" aria-live="polite">
        <div className="mb-2 text-center">
          <img className="auth-logo mb-3" src="/auth-logo.jpg" alt="EI BOURNAZEL Paul" />
          <h1 className="auth-heading mb-1">Vérification de l’email</h1>
          <p className="mb-0 text-body-secondary">GreenDesk</p>
        </div>
        {status === 'verifying' ? (
          <Loader label="Vérification de votre adresse email" />
        ) : (
          <>
            {status === 'pending' && (
              <p className="alert alert-info mb-0" role="status">
                Votre compte est créé. Consultez votre messagerie pour vérifier votre adresse email.
              </p>
            )}
            {message && (
              <p
                className={`alert ${status === 'verified' || status === 'resent' ? 'alert-success' : 'alert-danger'} mb-0`}
                role={status === 'invalid' ? 'alert' : 'status'}
              >
                {message}
              </p>
            )}
            {status !== 'verified' && (
              <form className="d-grid gap-3" onSubmit={resend}>
                <label className="form-label mb-0" htmlFor="verification-email">
                  Email
                  <input
                    id="verification-email"
                    className="form-control mt-1"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>
                <TimedProgressButton
                  busy={resending}
                  busyLabel="Envoi…"
                  className="btn btn-outline-brand"
                  cooldown={resendCooldown}
                  cooldownLabel={(seconds) => `Renvoyer dans ${seconds} s`}
                  type="submit"
                >
                  Renvoyer l’email de vérification
                </TimedProgressButton>
              </form>
            )}
            <p className="mb-0 text-center small text-body-secondary">
              <Link className="fw-semibold" to="/login">
                Retour à la connexion
              </Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}

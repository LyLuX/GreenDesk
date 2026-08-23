import { useEffect, useState } from 'react';

const normalizeSeconds = (seconds) => {
  const value = Math.ceil(Number(seconds));
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
};

export const createTimedCooldown = (seconds, now = Date.now()) => {
  const durationSeconds = normalizeSeconds(seconds);
  if (!durationSeconds) return null;
  return {
    startedAt: now,
    endsAt: now + durationSeconds * 1000,
  };
};

export const isTimedCooldownActive = (cooldown, now = Date.now()) =>
  Boolean(cooldown?.endsAt && cooldown.endsAt > now);

/** Preserves the supplied Bootstrap button design while visualizing work and cooldown progress. */
export default function TimedProgressButton({
  busy = false,
  busyLabel = 'Traitement…',
  children,
  className = '',
  cooldown = null,
  cooldownLabel = (seconds) => `Disponible dans ${seconds} s`,
  disabled = false,
  ...props
}) {
  const [now, setNow] = useState(Date.now());
  const currentTime = Math.max(now, cooldown?.startedAt ?? 0);
  const cooldownActive = isTimedCooldownActive(cooldown, currentTime);

  useEffect(() => {
    if (!isTimedCooldownActive(cooldown)) return undefined;
    setNow(Date.now());
    const interval = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime >= cooldown.endsAt) window.clearInterval(interval);
    }, 250);
    return () => window.clearInterval(interval);
  }, [cooldown]);

  const durationMs = Math.max(1, (cooldown?.endsAt ?? 0) - (cooldown?.startedAt ?? 0));
  const remainingMs = cooldownActive ? Math.max(0, cooldown.endsAt - currentTime) : 0;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const progress = cooldownActive
    ? Math.min(100, Math.max(0, ((durationMs - remainingMs) / durationMs) * 100))
    : 0;
  const content = busy ? busyLabel : cooldownActive ? cooldownLabel(remainingSeconds) : children;
  const baseAriaLabel = props['aria-label'];
  const ariaLabel = baseAriaLabel
    ? busy
      ? `${baseAriaLabel} - envoi en cours`
      : cooldownActive
        ? `${baseAriaLabel} - disponible dans ${remainingSeconds} seconde${remainingSeconds > 1 ? 's' : ''}`
        : baseAriaLabel
    : undefined;

  return (
    <button
      {...props}
      aria-busy={busy || undefined}
      aria-label={ariaLabel}
      className={`timed-progress-button${busy ? ' is-busy' : ''}${cooldownActive ? ' is-cooling-down' : ''} ${className}`.trim()}
      disabled={disabled || busy || cooldownActive}
    >
      {busy && <span className="timed-progress-button__fill" aria-hidden="true" />}
      {cooldownActive && (
        <progress
          className="timed-progress-button__progress"
          max="100"
          value={progress}
          aria-hidden="true"
        />
      )}
      <span className="timed-progress-button__label">{content}</span>
    </button>
  );
}

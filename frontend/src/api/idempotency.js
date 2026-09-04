const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
};
const randomKey = () => {
  if (typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID();
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/** Keeps one opaque key while the user retries the same unchanged write intent. */
export const resolveIdempotencyAttempt = (previous, request) => {
  const fingerprint = JSON.stringify(canonicalize(request));
  if (previous?.fingerprint === fingerprint) return previous;
  return { fingerprint, key: randomKey() };
};

/** Builds the mandatory header used by critical GreenDesk API writes. */
export const idempotencyRequestConfig = (key) => ({
  headers: { 'Idempotency-Key': key },
});

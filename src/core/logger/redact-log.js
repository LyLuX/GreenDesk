const sensitiveKey =
  /(?:password|passwd|^pass$|token|secret|^authorization$|cookie|^body$|^query$|^headers$|^sql$|^parameters$|^error$|^url$|^originalUrl$|^stack$|^filePath$)/i;

/** Drops raw exception diagnostics and credential-bearing metadata before any transport. */
export function redactLogRecord(info) {
  const seen = new WeakSet();
  const redact = (value) => {
    if (value instanceof Error) return { errorType: 'Error' };
    if (!value || typeof value !== 'object') return value;
    if (seen.has(value)) return '[Circular]';
    seen.add(value);
    if (Array.isArray(value)) return value.map(redact);
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        sensitiveKey.test(key) ? '[REDACTED]' : redact(entry),
      ]),
    );
  };
  for (const key of Object.keys(info)) {
    const unsafeRequestId =
      key === 'requestId' &&
      typeof info[key] === 'string' &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(info[key]);
    info[key] = sensitiveKey.test(key) || unsafeRequestId ? '[REDACTED]' : redact(info[key]);
  }
  return info;
}

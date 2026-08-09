/** Resolves public registration consistently for development and production builds. */
export function resolvePublicRegistrationEnabled(source = import.meta.env) {
  const explicitValue = source.VITE_PUBLIC_REGISTRATION_ENABLED;
  if (explicitValue === 'true') return true;
  if (explicitValue === 'false') return false;
  return source.PROD !== true;
}

export const publicRegistrationEnabled = resolvePublicRegistrationEnabled();

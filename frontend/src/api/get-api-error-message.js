// Translate legacy API messages at the display boundary: some are also protocol signals.
const legacyMessages = {
  'User not found': 'Utilisateur introuvable.',
  'Email is already in use': 'Cette adresse email est déjà utilisée.',
  'User is not deleted': 'Cet utilisateur n’est pas supprimé.',
  'One or more roles were not found': 'Un ou plusieurs rôles sont introuvables.',
  'Role not found': 'Rôle introuvable.',
  'Role name is already in use': 'Ce nom de rôle est déjà utilisé.',
  'One or more permissions were not found': 'Une ou plusieurs permissions sont introuvables.',
  'Permission not found': 'Permission introuvable.',
  'Permission name is already in use': 'Ce nom de permission est déjà utilisé.',
  'Material not found': 'Matériel introuvable.',
  'Material name is already in use': 'Ce nom de matériel est déjà utilisé.',
  'Material serial number is already in use': 'Ce numéro de série est déjà utilisé.',
  'The material matches multiple deleted records':
    'Ce matériel correspond à plusieurs fiches supprimées.',
  'Category not found': 'Catégorie introuvable.',
  'Category name is already in use': 'Ce nom de catégorie est déjà utilisé.',
  'Photo not found': 'Photo introuvable.',
  'The selected file type is not allowed': 'Ce type de fichier n’est pas autorisé.',
  'Authentication is required': 'Connectez-vous pour accéder à cette ressource.',
  'Insufficient permissions': 'Vous n’avez pas l’autorisation pour cette action.',
  'Invalid or expired access token': 'Votre session a expiré. Veuillez vous reconnecter.',
  'Internal server error': 'Une erreur serveur est survenue.',
};

export const getRetryAfterSeconds = (error) => {
  const retryAfterHeader =
    error?.response?.headers?.['retry-after'] ?? error?.response?.headers?.get?.('retry-after');
  const retryAfterSeconds = Math.ceil(Number(retryAfterHeader));
  return Number.isSafeInteger(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds : 0;
};

export default function getApiErrorMessage(error) {
  const status = error?.response?.status;
  const message = error?.response?.data?.error?.message;
  const details = error?.response?.data?.error?.details;
  if (message === 'Invalid email or password') {
    return 'Adresse email ou mot de passe incorrect.';
  }
  if (message === 'Email verification required') {
    return 'Vérifiez votre adresse email avant de vous connecter.';
  }
  if (message === 'Invalid or expired verification token') {
    return 'Ce lien de vérification est invalide ou a expiré.';
  }
  if (message === 'Email is already verified') {
    return 'Cette adresse email est déjà vérifiée.';
  }
  if (message === 'Email delivery is not configured') {
    return 'L’envoi d’emails n’est pas configuré.';
  }
  if (message === 'Email delivery failed') {
    return 'L’email n’a pas pu être envoyé. Réessayez dans quelques instants.';
  }
  if (message === 'Email verification resend cooldown active') {
    const retryAfterSeconds = getRetryAfterSeconds(error);
    if (retryAfterSeconds) {
      return `Un email vient déjà d’être envoyé. Réessayez dans ${retryAfterSeconds} seconde${retryAfterSeconds > 1 ? 's' : ''}.`;
    }
    return 'Un email vient déjà d’être envoyé. Réessayez dans quelques instants.';
  }
  if (Object.hasOwn(legacyMessages, message)) return legacyMessages[message];
  if (message && message !== 'Validation failed') return message;
  if (Array.isArray(details) && details.length) {
    return [
      ...new Set(
        details.map((detail) =>
          detail.msg && detail.msg !== 'Invalid value'
            ? detail.msg
            : `Le champ « ${detail.path ?? 'inconnu'} » contient une valeur invalide.`,
        ),
      ),
    ].join(' ');
  }
  if (message === 'Validation failed') return 'Les données saisies sont invalides.';
  if (!error?.response) return 'Le serveur est indisponible. Réessayez dans quelques instants.';
  return (
    {
      401: 'Votre session a expiré.',
      403: 'Vous n’avez pas l’autorisation pour cette action.',
      404: 'La ressource demandée est introuvable.',
      409: 'Cette donnée existe déjà.',
      500: 'Une erreur serveur est survenue.',
    }[status] ?? 'Une erreur est survenue.'
  );
}

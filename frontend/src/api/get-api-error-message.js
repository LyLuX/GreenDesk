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
  if (message) return message;
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

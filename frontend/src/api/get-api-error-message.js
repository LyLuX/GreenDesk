export default function getApiErrorMessage(error) {
  const status = error?.response?.status;
  const message = error?.response?.data?.error?.message;
  const details = error?.response?.data?.error?.details;
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

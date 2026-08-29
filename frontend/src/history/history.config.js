export const historySectionConfig = Object.freeze({
  fleet: Object.freeze({
    title: 'Historique de la gestion du parc',
    subtitle: 'Matériels et référentiels du parc',
    itemLabel: 'événement(s)',
    types: Object.freeze([
      { value: 'material', label: 'Matériel' },
      { value: 'category', label: 'Catégorie' },
      { value: 'manufacturer', label: 'Fabricant' },
      { value: 'supplier', label: 'Fournisseur' },
    ]),
  }),
  maintenance: Object.freeze({
    title: 'Historique de la maintenance',
    subtitle: 'Plans, interventions, pièces, stocks et prix',
    itemLabel: 'événement(s)',
    types: Object.freeze([
      { value: 'maintenance_plan', label: 'Plan de maintenance' },
      { value: 'planned_execution', label: 'Entretien planifié' },
      { value: 'unplanned_intervention', label: 'Intervention hors plan' },
      { value: 'maintenance_operation', label: 'Opération' },
      { value: 'maintenance_part', label: 'Pièce' },
      { value: 'stock_movement', label: 'Mouvement de stock' },
      { value: 'price_change', label: 'Changement de prix' },
    ]),
  }),
  administration: Object.freeze({
    title: 'Historique de l’administration',
    subtitle: 'Utilisateurs, rôles et permissions',
    itemLabel: 'événement(s)',
    types: Object.freeze([
      { value: 'user', label: 'Utilisateur' },
      { value: 'role', label: 'Rôle' },
      { value: 'permission', label: 'Permission' },
    ]),
  }),
});

export const historyTypeLabels = Object.freeze(
  Object.fromEntries(
    Object.values(historySectionConfig)
      .flatMap(({ types }) => types)
      .map(({ value, label }) => [value, label]),
  ),
);

export const historyActionLabels = Object.freeze({
  CREATE: 'Création',
  USER_CREATED: 'Création',
  RESTORE: 'Restauration',
  USER_RESTORED: 'Restauration',
  UPDATE: 'Modification',
  USER_UPDATED: 'Modification',
  USER_EMAIL_VERIFICATION_SENT: 'Envoi de vérification',
  USER_EMAIL_VERIFIED: 'Email vérifié',
  STATUS_CHANGE: 'Changement de statut',
  DELETE: 'Suppression',
  USER_DELETED: 'Suppression',
  LOGIN_SUCCESS: 'Connexion',
  LOGOUT_SUCCESS: 'Déconnexion',
  EXECUTE: 'Entretien réalisé',
  EXECUTE_PARTIAL_PARTS: 'Remplacement partiel',
  EXECUTE_WITHOUT_PARTS: 'Entretien sans remplacement',
  INTERVENTION: 'Intervention réalisée',
  ORDER: 'Commande',
  RECEIVE: 'Réception',
  CONSUME: 'Utilisation',
  ADJUST: 'Correction de stock',
  MIGRATE: 'Reprise de stock',
  PRICE_UPDATE: 'Changement de prix',
  MINIMUM_STOCK_UPDATE: 'Modification du stock minimum',
});

export const historyActionVariants = Object.freeze({
  CREATE: 'success',
  USER_CREATED: 'success',
  RESTORE: 'success',
  USER_RESTORED: 'success',
  UPDATE: 'info',
  USER_UPDATED: 'info',
  USER_EMAIL_VERIFICATION_SENT: 'info',
  USER_EMAIL_VERIFIED: 'success',
  STATUS_CHANGE: 'info',
  DELETE: 'danger',
  USER_DELETED: 'danger',
  LOGIN_SUCCESS: 'access',
  LOGOUT_SUCCESS: 'neutral',
  EXECUTE: 'maintenance',
  EXECUTE_PARTIAL_PARTS: 'warning',
  EXECUTE_WITHOUT_PARTS: 'warning',
  INTERVENTION: 'maintenance',
  ORDER: 'warning',
  RECEIVE: 'success',
  CONSUME: 'warning',
  ADJUST: 'info',
  MIGRATE: 'info',
  PRICE_UPDATE: 'info',
  MINIMUM_STOCK_UPDATE: 'info',
});

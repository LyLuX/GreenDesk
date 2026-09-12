# Conventions de développement GreenDesk

## Organisation

Les composants métier résident dans `src/modules/<domaine>`, avec les dossiers
`model`, `repository`, `service`, `controller`, `routes` et `validator` selon les besoins.
Un repository métier importe son modèle et les helpers partagés de `src/core`.
Les repositories des catégories suivent désormais cette organisation, comme ceux des matériels.

`src/core` accueille les mécanismes transverses : transactions, contexte société,
stock partagé, idempotence, erreurs et réponses HTTP. Les repositories techniques du stock
et de l’idempotence restent auprès de leur service partagé.

Les fichiers JavaScript utilisent des noms descriptifs en kebab-case avec leur rôle
(`category.repository.js`) ; les composants React utilisent le PascalCase.

## Services et réponses publiques

Les repositories réalisent les accès aux données. Les services portent les règles métier
et les transactions d’écriture ; les contrôleurs adaptent les paramètres HTTP et utilisent
`successResponse` pour l’enveloppe de réponse. Un service ne reçoit pas l’objet Express
`response` et ne fabrique pas une seconde enveloppe `{ success, data }`.

Préserver le contrat de chaque méthode existante : plusieurs services retournent encore
des instances Sequelize utilisées par d’autres services. Leur conversion systématique en
objets simples nécessite une analyse séparée des appelants et des champs exposés.
Pour les listes paginées, réutiliser `normalizePagination` et `paginatedResult`.
Pour les données sensibles, réutiliser les projections publiques existantes, notamment
`UserService.publicUser`, et vérifier que les secrets et identifiants internes ne sont pas exposés.
Toute modification des champs publics doit mettre à jour OpenAPI et les tests du contrat.

## Messages utilisateur

Les nouveaux messages affichés sont rédigés en français, avec les termes de l’interface
(matériel, pièce, société, entretien). Les erreurs API se présentent via
`frontend/src/api/get-api-error-message.js`, qui conserve les détails de validation et le
délai `Retry-After` lorsqu’il est disponible.

Certains messages anglais historiques servent aussi de signaux de protocole, par exemple
`Email verification required` dans la connexion. Leur traduction se fait à l’affichage,
sans modifier la valeur reçue ni les décisions d’authentification. Ne pas remplacer ces valeurs
côté serveur sans traiter les appelants et le contrat API dans la même évolution.
Les messages français précis sont conservés. La traduction des messages historiques reste
progressive ; une nouvelle formulation doit être accompagnée d’un test de présentation.

## Contrôles

Exécuter `npm run lint`, `npm run format:check` et les tests pertinents.
Le lint couvre JavaScript, JSX et les hooks React. `npm run format` applique Prettier.
Avant une publication, suivre les contrôles et les règles de lot de `AGENTS.md`.

# GreenDesk

Backend Node.js et frontend React pour la gestion de parc matériel des espaces verts.

## Modules disponibles

Authentification, utilisateurs, rôles, permissions, audit, catégories, marques et matériels.

## API

- `GET|POST /api/v1/categories`, `GET|PUT|DELETE /api/v1/categories/:uuid`
- `GET|POST /api/v1/materials`, `GET|PUT|DELETE /api/v1/materials/:uuid`
- `GET|POST /api/v1/brands`, `PUT|DELETE /api/v1/brands/:uuid`
- `GET|POST|DELETE /api/v1/brands/:uuid/logo`
- `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`
- `POST /api/v1/materials/:uuid/photos`, `POST /api/v1/materials/:uuid/documents`, `GET /api/v1/materials/:uuid/history`
- `POST /api/v1/auth/logout` révoque le JWT courant avant son expiration
- `GET /api/v1/materials/files/:fileUuid/content`, `GET /api/v1/materials/files/:fileUuid/download`
- `PATCH /api/v1/materials/files/:fileUuid/primary`, `DELETE /api/v1/materials/files/:fileUuid`

Les permissions ajoutées sont `categories.*` et `materials.*` avec les actions `read`, `create`, `update`, `delete`.

Le dashboard est disponible via `GET /api/v1/dashboard/summary`, protégé par `dashboard.read`. Il compte les matériels, les catégories et les marques, calcule la valeur d’achat cumulée, le coût moyen et l’âge moyen du parc, puis retourne les compteurs et les listes d’entretiens à faire aujourd’hui, sous 30 jours et en retard.

La documentation Swagger UI est servie sur `/docs` et le document OpenAPI brut sur `/docs/openapi.json`. Son contrat est centralisé dans `src/config/openapi-paths.js` pour les opérations et `src/config/openapi-components.js` pour les données. Toute modification d’une route, d’un paramètre, d’un corps, d’une réponse, d’une permission ou d’un code HTTP doit mettre à jour ces fichiers dans le même commit. `npm run docs:check` valide la conformité OpenAPI 3 et vérifie automatiquement la couverture des routes canoniques, les références de composants, les identifiants d’opération et les données de maintenance.

## Sprint 5 : parc matériel

Un matériel contient son UUID public, nom, marque, modèle, catégorie, numéro de série, dates, prix d’achat et notes. Les relations sont exclusivement transmises et renvoyées avec des UUID publics. La liste supporte la recherche, les filtres par statut, marque et catégorie, le tri et la pagination.

Les photos (JPEG, PNG, WebP) et documents PDF sont stockés sous `uploads/materials`, sans exposition statique du dossier. Les photos sont consultées via une route authentifiée inline ; les documents sont téléchargés en pièce jointe via une route authentifiée. Chaque fichier est limité à 10 Mo et chaque matériel à 10 photos. Les fichiers reçoivent un nom UUID dérivé de leur MIME autorisé, jamais de leur nom client. L’historique de chaque modification est disponible sur la fiche matériel.

Chaque marque peut recevoir un logo JPEG, PNG ou WebP de 2 Mo maximum. Les logos sont stockés sous `uploads/brands` avec un nom serveur UUID et sont affichés via une route authentifiée.

### Permissions

| Domaine    | Permissions                                                                      |
| ---------- | -------------------------------------------------------------------------------- |
| Matériels  | `materials.read`, `materials.create`, `materials.update`, `materials.delete`     |
| Marques    | `brands.read`, `brands.create`, `brands.update`, `brands.delete`                 |
| Catégories | `categories.read`, `categories.create`, `categories.update`, `categories.delete` |

`/api/v1` est le préfixe à utiliser pour les nouveaux appels. Les chemins historiques `/api/categories`, `/api/materials`, `/api/brands`, `/api/dashboard` et `/api/maintenance` restent des alias de compatibilité dépréciés.

## Sprint 6 : maintenance préventive

Chaque matériel peut recevoir plusieurs plans de maintenance : préventif, inspection, remplacement, lubrification, nettoyage ou personnalisé. Un plan possède un intervalle en jours, une priorité et la date du dernier entretien. La prochaine échéance est recalculée à la création, à la modification et lors de l’exécution d’un entretien. L’API expose `GET|POST /api/v1/maintenance`, `GET|PUT|DELETE /api/v1/maintenance/:uuid`, `PATCH /api/v1/maintenance/:uuid/status`, `POST /api/v1/maintenance/:uuid/execute` et `GET /api/v1/maintenance/:uuid/history`.

Une tâche est à faire aujourd’hui lorsque sa prochaine date correspond à la date du jour, en retard lorsque cette date est dépassée, et à prévoir lorsqu’elle tombe dans les 30 prochains jours. Les dates métier sont des valeurs UTC `YYYY-MM-DD`, sans heure. L’exécution met à jour transactionnellement la tâche et son historique.

Les permissions sont `maintenance.read`, `maintenance.create`, `maintenance.update`, `maintenance.delete` et `maintenance.execute`. Le tableau de bord compte les entretiens prévus aujourd’hui, en retard et dans les 30 prochains jours. Chaque compteur non nul donne accès à la liste exacte des entretiens concernés.

Les intitulés répétitifs sont centralisés dans un catalogue d’opérations accessible via `/api/v1/maintenance/operations`. Les références réellement commandables sont enregistrées dans `/api/v1/maintenance/parts`, puis associées aux plans avec une quantité. Une même opération, par exemple le remplacement d’une bougie, peut ainsi utiliser des références différentes selon le matériel. `GET /api/v1/maintenance/order-list` regroupe les quantités nécessaires aux plans arrivant à échéance sur un horizon configurable.

L’interface sépare ces référentiels sur les pages `/maintenance/operations` et `/maintenance/parts`. Elles permettent de rechercher, créer, modifier, désactiver, réactiver et supprimer les opérations ou pièces selon les permissions `maintenance.*`.

La migration `20260727_zz_add_maintenance_catalogs.js` est additive : elle conserve les intitulés et toutes les données historiques des plans. Son annulation supprime uniquement les catalogues, leurs associations et la colonne de liaison, ce qui permet de revenir au fonctionnement précédent sans perdre un plan.

## Configuration

Créez `.env` depuis `.env.example` pour le backend et `frontend/.env` depuis `frontend/.env.example` pour l'interface. `VITE_API_URL=/api` est la valeur de développement par défaut. Aucun secret réel ne doit être committé.

Le seeder crée un administrateur réservé au développement. Consultez le seeder local pour ses identifiants, et changez-les dans tout environnement partagé.

## Lancement

```bash
npm install
npm run seed
npm run dev
cd frontend
npm install
npm run dev
```

## Vérifications

Backend : `npm test`, `npm run docs:check`, `npm run lint`, `npm run format:check`.

Frontend : `cd frontend`, puis `npm test` et `npm run build`.

## Architecture

Le backend organise les responsabilités en `routes`, `controller`, `service`, `repository` et `model` sous `src/modules`. Les erreurs traversent le middleware global et les accès sensibles sont protégés par JWT et permissions. Le frontend React se trouve dans `frontend/src` : `auth` gère la session, `api` centralise les appels HTTP, `layouts` l’interface authentifiée et `pages` les écrans.

## Authentification et permissions

La connexion retourne un access token JWT et le profil utilisateur avec ses rôles et permissions. La session est conservée dans le navigateur sans mot de passe, contrôlée à la restauration et supprimée sur expiration ou réponse HTTP 401. Les permissions déterminent les menus, actions et routes, tandis que le backend reste la source d’autorité.

## Variables d’environnement

Backend : `NODE_ENV`, `PORT`, `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_LOGGING`, `CORS_ORIGIN`, `JWT_SECRET`, `JWT_ACCESS_TOKEN_TTL`.

Frontend : `VITE_API_URL`, par défaut `/api`.

## Sequelize CLI

`sequelize-cli` est configuré pour utiliser les mêmes variables `DATABASE_*` que le backend. Les migrations et seeders générés sont en CommonJS afin de rester compatibles avec le projet principal en ES Modules.

```bash
npm run db:create
npm run db:migration:generate -- --name add-example-table
npm run db:migrate
npm run db:migrate:status
npm run db:migrate:undo
npm run db:seed:generate -- --name example-data
npm run db:seed
```

Les fichiers SQL présents dans `migrations/` sont des migrations historiques à appliquer avec le processus de déploiement existant ; seules les migrations JavaScript générées par `sequelize-cli` sont suivies par `db:migrate`.

## Dépannage

Si Vite ou `npm ci` échoue avec `EPERM` dans un dossier synchronisé, fermez les processus utilisant `frontend/dist` ou `frontend/node_modules`, puis relancez la commande. Ne versionnez jamais `.env`, `node_modules` ou `frontend/dist`.

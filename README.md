# GreenDesk

Backend Node.js et frontend React pour la gestion de parc matériel des espaces verts.

## Modules disponibles

Authentification, utilisateurs, rôles, permissions, audit, catégories, propriétés, marques et matériels.

## API

- `GET|POST /api/categories`, `GET|PUT|DELETE /api/categories/:uuid`
- `GET|POST /api/properties`, `GET|PUT|DELETE /api/properties/:uuid`
- `GET|POST /api/v1/materials`, `GET|PUT|DELETE /api/v1/materials/:uuid`
- `GET|POST /api/brands`, `GET|PUT|DELETE /api/brands/:uuid`
- `POST /api/v1/materials/:uuid/photos`, `POST /api/v1/materials/:uuid/documents`, `GET /api/v1/materials/:uuid/history`
- `POST /api/v1/auth/logout` révoque le JWT courant avant son expiration
- `GET /api/v1/materials/files/:fileUuid/content`, `GET /api/v1/materials/files/:fileUuid/download`
- `PATCH|DELETE /api/v1/materials/files/:fileUuid`

Les permissions ajoutées sont `categories.*`, `properties.*` et `materials.*` avec les actions `read`, `create`, `update`, `delete`.

Le dashboard est disponible via `GET /api/dashboard/summary`, protégé par `dashboard.read`. Il compte les matériaux, les catégories, les propriétés et les marques, et calcule la valeur, le coût moyen et l’âge moyen du parc par agrégats SQL. La documentation OpenAPI est servie sur `/docs`.

## Sprint 5 : parc matériel

Un matériel contient son UUID public, nom, référence, marque, modèle, catégorie, propriété, numéro de série, année, dates, prix, valeur actuelle, heures moteur et notes. Les relations sont exclusivement transmises et renvoyées avec des UUID publics. La liste supporte la recherche, les filtres par statut/marque/catégorie/propriété, le tri et la pagination.

Les photos (JPEG, PNG, WebP) et documents PDF sont stockés sous `uploads/materials`, sans exposition statique du dossier. Les photos sont consultées via une route authentifiée inline ; les documents sont téléchargés en pièce jointe via une route authentifiée. Chaque fichier est limité à 10 Mo et chaque matériel à 10 photos. Les fichiers reçoivent un nom UUID dérivé de leur MIME autorisé, jamais de leur nom client. L’historique de chaque modification est disponible sur la fiche matériel.

### Permissions

| Domaine    | Permissions                                                                      |
| ---------- | -------------------------------------------------------------------------------- |
| Matériels  | `materials.read`, `materials.create`, `materials.update`, `materials.delete`     |
| Marques    | `brands.read`, `brands.create`, `brands.update`, `brands.delete`                 |
| Catégories | `categories.read`, `categories.create`, `categories.update`, `categories.delete` |
| Propriétés | `properties.read`, `properties.create`, `properties.update`, `properties.delete` |

`/api/v1` est le préfixe à utiliser pour les nouveaux appels. Les chemins historiques `/api/categories`, `/api/properties`, `/api/materials`, `/api/brands` et `/api/dashboard` restent des alias de compatibilité.

## Sprint 6 : maintenance préventive

Chaque matériel peut recevoir plusieurs plans de maintenance : préventif, inspection, remplacement, lubrification, nettoyage ou personnalisé. Un plan possède un intervalle en jours et/ou en heures moteur, une priorité et ses dernières valeurs d’entretien. Les prochaines échéances sont recalculées à la création, à la modification et lors de l’exécution d’un entretien. L’API expose `GET|POST /api/v1/maintenance`, `GET|PUT /api/v1/maintenance/:uuid`, `POST /api/v1/maintenance/:uuid/execute` et `GET /api/v1/maintenance/:uuid/history`.

Une tâche est en retard dès que sa première échéance est atteinte : date du jour supérieure ou égale à la prochaine date, ou compteur matériel supérieur ou égal au prochain compteur. Elle est à prévoir dans les 30 jours ou lorsque les heures restantes sont inférieures ou égales à `max(10 h, 20 % de l’intervalle horaire)`. Les dates métier sont des valeurs UTC `YYYY-MM-DD`, sans heure. L’exécution est transactionnelle : tâche, historique et compteur matériel sont mis à jour ensemble.

Les permissions sont `maintenance.read`, `maintenance.create`, `maintenance.update`, `maintenance.delete` et `maintenance.execute`. Le tableau de bord compte les entretiens prévus aujourd’hui, en retard, réalisés ce mois et prévus dans les 30 jours.

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

Backend : `npm test`, `npm run lint`, `npm run format:check`.

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

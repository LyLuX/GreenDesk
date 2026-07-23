# GreenDesk

Backend Node.js et frontend React pour la gestion de parc matériel des espaces verts.

## Modules disponibles

Authentification, utilisateurs, rôles, permissions, audit, catégories, propriétés et matériaux.

## API Sprint 4

- `GET|POST /api/categories`, `GET|PUT /api/categories/:uuid`, `PATCH /api/categories/:uuid/status`
- `GET|POST /api/properties`, `GET|PUT /api/properties/:uuid`, `PATCH /api/properties/:uuid/status`
- `GET|POST /api/materials`, `GET|PUT /api/materials/:uuid`, `PATCH /api/materials/:uuid/status`

Les permissions ajoutées sont `categories.*`, `properties.*` et `materials.*` avec les actions `read`, `create`, `update`, `disable`.

Le dashboard est disponible via `GET /api/dashboard/summary`, protégé par `dashboard.read`. Il compte les matériaux (total, actifs, inactifs), les catégories et les propriétés sans charger les listes complètes. La documentation OpenAPI est servie sur `/docs`.

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

## Dépannage

Si Vite ou `npm ci` échoue avec `EPERM` dans un dossier synchronisé, fermez les processus utilisant `frontend/dist` ou `frontend/node_modules`, puis relancez la commande. Ne versionnez jamais `.env`, `node_modules` ou `frontend/dist`.

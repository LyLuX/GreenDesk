# GreenDesk

Backend Node.js et frontend React pour la gestion de parc matériel des espaces verts.

## Versionnement

La version actuelle de GreenDesk est **1.12.0**. Le backend, le frontend, leurs lockfiles, l’endpoint de santé et le contrat Swagger/OpenAPI utilisent la même version.

GreenDesk suit le versionnement sémantique `MAJOR.MINOR.PATCH` :

- `PATCH` pour une correction rétrocompatible ;
- `MINOR` pour une nouvelle fonctionnalité rétrocompatible ;
- `MAJOR` pour une rupture de compatibilité.

Chaque modification livrée doit mettre à jour tous les emplacements de version concernés, vérifier le README et OpenAPI, exécuter les tests et générer le build frontend avant le commit et le push.

## Modules disponibles

Authentification, utilisateurs, rôles, permissions, audit, catégories, fabricants, fournisseurs et matériels.

La navigation latérale regroupe les pages dans trois menus accordéon : `Gestion du parc`, `Maintenance` et `Administration`. Un seul groupe est ouvert à la fois, le groupe de la page active s’ouvre automatiquement et les entrées restent filtrées selon les permissions. Sur mobile, le menu devient un tiroir latéral accessible au clavier qui se ferme après la navigation.

Les pages de listes utilisent un panneau de recherche et de filtres commun. Il conserve les mêmes libellés pour une même fonction, s’adapte sur une, deux ou trois colonnes et répartit uniformément toute ligne contenant moins de trois champs. Il accepte au maximum six champs : une recherche et cinq filtres. Les catalogues affichant un état actif/inactif utilisent tous le libellé `Statut`. Les pages d’administration permettent également de filtrer les utilisateurs par statut et rôle, et les rôles par permission.

Le pied de page global affiche le copyright `EI BOURNAZEL Paul` ainsi que la version courante de GreenDesk, lue automatiquement depuis les métadonnées du frontend.

Les pages « Accès refusé » et « Page introuvable » proposent une action permettant de retourner directement au tableau de bord.

Les notifications s’adaptent à la longueur de leur contenu et conservent une largeur maximale responsive afin de rester compactes sans déborder de l’écran.

Le gabarit principal occupe exactement la hauteur visible de la fenêtre, footer compris. Les contenus dépassant cette hauteur restent accessibles dans leur zone centrale sans afficher de barre de défilement globale ou interne.

## API

- `GET|POST /api/v1/categories`, `GET|PUT|DELETE /api/v1/categories/:uuid`
- `GET|POST /api/v1/materials`, `GET|PUT|DELETE /api/v1/materials/:uuid`
- `GET|POST /api/v1/manufacturers`, `PUT|DELETE /api/v1/manufacturers/:uuid`
- `GET|POST|DELETE /api/v1/manufacturers/:uuid/logo`
- `GET|POST /api/v1/suppliers`, `PUT|DELETE /api/v1/suppliers/:uuid`
- `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`
- `POST /api/v1/materials/:uuid/photos`, `POST /api/v1/materials/:uuid/documents`, `GET /api/v1/materials/:uuid/history`
- `POST /api/v1/auth/logout` révoque le JWT courant avant son expiration
- `GET /api/v1/materials/files/:fileUuid/content`, `GET /api/v1/materials/files/:fileUuid/download`
- `PATCH /api/v1/materials/files/:fileUuid/primary`, `DELETE /api/v1/materials/files/:fileUuid`

Les permissions ajoutées sont `categories.*` et `materials.*` avec les actions `read`, `create`, `update`, `delete`.

Le dashboard est disponible via `GET /api/v1/dashboard/summary`, protégé par `dashboard.read`. Il compte les matériels, les catégories et les fabricants, calcule la valeur d’achat cumulée, le coût moyen et l’âge moyen du parc, puis retourne les compteurs et les listes d’entretiens à faire aujourd’hui, sous 30 jours et en retard.

La documentation Swagger UI est servie sur `/docs` et le document OpenAPI brut sur `/docs/openapi.json`. Son contrat est centralisé dans `src/config/openapi-paths.js` pour les opérations et `src/config/openapi-components.js` pour les données. Toute modification d’une route, d’un paramètre, d’un corps, d’une réponse, d’une permission ou d’un code HTTP doit mettre à jour ces fichiers dans le même commit. `npm run docs:check` valide la conformité OpenAPI 3 et vérifie automatiquement la couverture des routes canoniques, les références de composants, les identifiants d’opération et les données de maintenance.

## Sprint 5 : parc matériel

Un matériel contient son UUID public, nom, fabricant, modèle, catégorie, numéro de série, dates, prix d’achat et notes. Les relations sont exclusivement transmises et renvoyées avec des UUID publics. La liste supporte la recherche, les filtres par statut, fabricant et catégorie, le tri et la pagination.

Les photos (JPEG, PNG, WebP) et documents PDF sont stockés sous `uploads/materials`, sans exposition statique du dossier. Les photos sont consultées via une route authentifiée inline ; les documents sont téléchargés en pièce jointe via une route authentifiée. Chaque fichier est limité à 10 Mo et chaque matériel à 10 photos. Les fichiers reçoivent un nom UUID dérivé de leur MIME autorisé, jamais de leur nom client. La fiche matériel présente les informations, les documents, la maintenance et l’historique sous forme de tableaux. L’historique utilise des libellés métier, remplace les identifiants internes du fabricant et de la catégorie par leurs noms et ignore les différences purement décimales d’un prix inchangé.

Chaque fabricant peut recevoir un logo JPEG, PNG ou WebP de 2 Mo maximum. Les logos sont stockés sous `uploads/manufacturers` avec un nom serveur UUID et sont affichés via une route authentifiée. Les anciennes marques sont migrées dans ce référentiel avec leurs logos et leurs matériels.

### Permissions

| Domaine                   | Permissions                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Matériels                 | `materials.read`, `materials.create`, `materials.update`, `materials.delete`                                                     |
| Fabricants                | `manufacturers.read`, `manufacturers.create`, `manufacturers.update`, `manufacturers.delete`                                     |
| Fournisseurs              | `suppliers.read`, `suppliers.create`, `suppliers.update`, `suppliers.delete`                                                     |
| Catégories                | `categories.read`, `categories.create`, `categories.update`, `categories.delete`                                                 |
| Plans de maintenance      | `maintenance.read`, `maintenance.create`, `maintenance.update`, `maintenance.delete`, `maintenance.execute`                      |
| Opérations de maintenance | `maintenance.operations.read`, `maintenance.operations.create`, `maintenance.operations.update`, `maintenance.operations.delete` |
| Pièces de maintenance     | `maintenance.parts.read`, `maintenance.parts.create`, `maintenance.parts.update`, `maintenance.parts.delete`                     |

L’activation et la désactivation des matériels, catégories, fabricants et fournisseurs utilisent
la permission `update` de leur domaine ; aucune permission de statut supplémentaire n’est requise.
Dans toute l’interface, les filtres `Statut` sélectionnent les éléments actifs par défaut et les
boutons `Activer` ou `Réactiver` utilisent le style bleu commun.

`/api/v1` est le préfixe à utiliser pour les nouveaux appels. Les chemins historiques `/api/categories`, `/api/materials`, `/api/brands`, `/api/dashboard`, `/api/maintenance`, `/api/v1/brands`, `/api/v1/maintenance/manufacturers` et `/api/v1/maintenance/suppliers` restent des alias de compatibilité dépréciés.

## Sprint 6 : maintenance préventive

Chaque matériel peut recevoir plusieurs plans de maintenance : préventif, inspection, remplacement, lubrification, nettoyage ou personnalisé. Un plan possède un intervalle en jours, une priorité et la date du dernier entretien. La prochaine échéance est recalculée à la création, à la modification et lors de l’exécution d’un entretien. L’API expose `GET|POST /api/v1/maintenance`, `GET|PUT|DELETE /api/v1/maintenance/:uuid`, `PATCH /api/v1/maintenance/:uuid/status`, `POST /api/v1/maintenance/:uuid/execute` et `GET /api/v1/maintenance/:uuid/history`.

La liste des plans accepte une recherche sur le nom, la description, les notes, le matériel et l’opération, ainsi que des filtres par matériel, priorité, type, échéance et statut d’activation. Dans l’interface, ces contrôles utilisent le panneau de filtres partagé. Depuis l’onglet Maintenance d’un matériel, le bouton `Voir la maintenance` ouvre cette liste préfiltrée sur le matériel concerné et affiche directement tous ses plans.

Une tâche est à faire aujourd’hui lorsque sa prochaine date correspond à la date du jour, en retard lorsque cette date est dépassée, et à prévoir lorsqu’elle tombe dans les 30 prochains jours. Les dates métier sont des valeurs UTC `YYYY-MM-DD`, sans heure. L’exécution met à jour transactionnellement la tâche et son historique.

Les plans utilisent `maintenance.read`, `maintenance.create`, `maintenance.update`, `maintenance.delete` et `maintenance.execute`. Les catalogues d’opérations et de pièces utilisent respectivement `maintenance.operations.*` et `maintenance.parts.*`, avec les actions `read`, `create`, `update` et `delete`. Les routes, menus et boutons sont filtrés avec ces mêmes permissions. Le tableau de bord compte les entretiens prévus aujourd’hui, en retard et dans les 30 prochains jours uniquement lorsque l’utilisateur possède `maintenance.read`. Chaque compteur non nul donne accès à la liste exacte des entretiens concernés. Un bouton dans cette liste ouvre la page Maintenance en présélectionnant l’échéance correspondante.

Les intitulés répétitifs sont centralisés dans un catalogue d’opérations accessible via `/api/v1/maintenance/operations`. Les références réellement commandables sont enregistrées dans `/api/v1/maintenance/parts`, puis associées aux plans avec une quantité. Une même opération, par exemple le remplacement d’une bougie, peut ainsi utiliser des références différentes selon le matériel. `GET /api/v1/maintenance/order-list` regroupe les quantités nécessaires aux plans arrivant à échéance sur un horizon configurable. La modale de commande accorde le libellé `pièce` à la quantité et permet d’imprimer une liste dédiée, sans les contrôles de l’interface.

L’interface sépare les opérations et les pièces sur les pages `/maintenance/operations` et `/maintenance/parts`. Les fabricants et les fournisseurs sont des référentiels globaux accessibles sur `/manufacturers` et `/suppliers`, avec leurs permissions dédiées. Une pièce référence ainsi un fabricant et un fournisseur enregistrés, en plus de ses références fabricant et fournisseur.

Les migrations `20260727_zz_add_maintenance_catalogs.js` et `20260727_zzz_add_part_manufacturers_suppliers.js` sont additives : elles conservent les intitulés, les fabricants saisis auparavant et toutes les données historiques des plans. Leur annulation retire uniquement les nouveaux catalogues et leurs associations, ce qui permet de revenir au fonctionnement précédent sans perdre un plan ni son ancien fabricant texte. Les migrations `20260730_add_maintenance_catalog_permissions.js` et `20260730_zz_add_maintenance_plan_permissions.js` ajoutent toutes les permissions de maintenance aux bases existantes ; les attributions génériques déjà présentes sont recopiées vers les catalogues pour préserver les accès lors du déploiement.

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

Pour rendre le frontend accessible aux appareils connectés au même réseau local, démarrez d’abord le backend normalement, puis utilisez le script dédié dans `frontend` :

```bash
npm run dev:lan
```

Vite écoute alors sur toutes les interfaces réseau. Ouvrez depuis l’autre appareil l’adresse affichée sous `Network`, par exemple `http://192.168.1.6:5173`. Cette commande est réservée au développement sur un réseau privé de confiance.

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

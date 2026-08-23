# GreenDesk

Backend Node.js et frontend React pour la gestion de parc matériel des espaces verts.

## Versionnement

La version actuelle de GreenDesk est **7.22.0**. Le backend, le frontend, leurs lockfiles, l’endpoint de santé et le contrat Swagger/OpenAPI utilisent la même version.

GreenDesk suit le versionnement sémantique `MAJOR.MINOR.PATCH` :

- `PATCH` pour une correction rétrocompatible ;
- `MINOR` pour une nouvelle fonctionnalité rétrocompatible ;
- `MAJOR` pour une rupture de compatibilité.

Chaque modification livrée doit mettre à jour tous les emplacements de version concernés, vérifier le README et OpenAPI, exécuter les tests et générer le build frontend avant le commit et le push.

Les en-têtes HTTP de sécurité et la compression sont centralisés dans
`src/config/http-middleware.js`. La politique CSP n’autorise que les ressources locales, les
images `data:` utilisées par Bootstrap et les images authentifiées chargées en `blob:`. Les
styles inline sont interdits, sauf les empreintes SHA-256 exactes générées par Swagger UI sur
`/docs`. La compression zlib utilise le réglage équilibré validé par benchmark.

La gestion du cache dépend de l’environnement. En `development` et en `test`, l’API et le
serveur Vite interdisent explicitement tout stockage par le navigateur et les caches
intermédiaires. En `production`, les données privées sont systématiquement revalidées, les
réponses sensibles ne sont jamais stockées, le HTML est revalidé et les fichiers Vite
fingerprintés sont immuables pendant un an. Les ressources statiques non fingerprintées sont
conservées pendant un jour. La documentation API n’est jamais stockée et n’est pas exposée en
production.

## Modules disponibles

Authentification, utilisateurs, rôles, permissions, audit, catégories, fabricants, fournisseurs et matériels.

La navigation latérale regroupe les pages dans trois menus accordéon : `Gestion du parc`, `Maintenance` et `Administration`. Un seul groupe est ouvert à la fois, le groupe de la page active s’ouvre automatiquement et les entrées restent filtrées selon les permissions. Sur mobile, le menu devient un tiroir latéral accessible au clavier qui se ferme après la navigation.

Les pages de listes utilisent un panneau de recherche et de filtres commun. Il conserve les mêmes libellés pour une même fonction, s’adapte sur une, deux ou trois colonnes et répartit uniformément toute ligne contenant moins de trois champs. Il accepte au maximum six champs : une recherche et cinq filtres. Les catalogues affichant un état actif/inactif utilisent tous le libellé `Statut`. La modale de création et de modification d’un matériel limite sa hauteur à l’écran : seuls les champs défilent, tandis que le titre et le bouton d’enregistrement restent visibles. Les pages d’administration permettent également de filtrer les utilisateurs par statut et rôle, et les rôles par permission. Un administrateur peut désactiver ou réactiver un compte depuis le tableau des utilisateurs avec les actions d’état et confirmations communes à l’application.

Le pied de page global affiche le copyright `EI BOURNAZEL Paul` ainsi que la version courante de GreenDesk, lue automatiquement depuis les métadonnées du frontend. L’âge moyen du parc est présenté en années et mois, avec les pluriels français, plutôt qu’en années décimales.

Les pages « Accès refusé » et « Page introuvable » proposent une action permettant de retourner directement au tableau de bord.

Les notifications s’adaptent à la longueur de leur contenu et conservent une largeur maximale responsive afin de rester compactes sans déborder de l’écran.

Toutes les dates affichées utilisent le format français numérique `JJ/MM/AAAA`. Lorsqu’une heure est nécessaire, le format commun est `JJ/MM/AAAA HH:mm` dans le fuseau `Europe/Paris`. Les champs de formulaire et les échanges avec l’API conservent leurs valeurs ISO techniques.

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

En développement et en test, la documentation Swagger UI est servie sur `/docs` et le document OpenAPI brut sur `/docs/openapi.json`. Ces routes ne sont pas montées en production et une requête les visant reçoit une réponse `404` non stockable. Le contrat reste utilisable par les contrôles internes et est centralisé dans `src/config/openapi-paths.js` pour les opérations et `src/config/openapi-components.js` pour les données. Toute modification d’une route, d’un paramètre, d’un corps, d’une réponse, d’une permission ou d’un code HTTP doit mettre à jour ces fichiers dans le même commit. `npm run docs:check` valide la conformité OpenAPI 3 et vérifie automatiquement la couverture des routes canoniques, les références de composants, les identifiants d’opération et les données de maintenance.

## Sprint 5 : parc matériel

Un matériel contient son UUID public, nom, fabricant, modèle, catégorie, numéro de série, dates, prix d’achat et notes. Les relations sont exclusivement transmises et renvoyées avec des UUID publics. La liste supporte la recherche, les filtres par statut, fabricant et catégorie, le tri et la pagination.

Les photos (JPEG, PNG, WebP) et documents PDF sont stockés sous `uploads/materials`, sans exposition statique du dossier. Les photos sont consultées via une route authentifiée inline ; les documents sont téléchargés en pièce jointe via une route authentifiée. Chaque fichier est limité à 10 Mo et chaque matériel à 10 photos. Les fichiers reçoivent un nom UUID dérivé de leur MIME autorisé, jamais de leur nom client. Avant toute écriture en base, leur signature binaire est détectée et doit correspondre au MIME déclaré ; un fichier falsifié ou non reconnu est immédiatement supprimé. La fiche matériel présente les informations, les documents, la maintenance et l’historique sous forme de tableaux. L’historique utilise des libellés métier, remplace les identifiants internes du fabricant et de la catégorie par leurs noms et ignore les différences purement décimales d’un prix inchangé.

Chaque fabricant peut recevoir un logo JPEG, PNG ou WebP de 2 Mo maximum. Les logos sont stockés sous `uploads/manufacturers` avec un nom serveur UUID et sont affichés via une route authentifiée. Leur signature binaire doit correspondre au MIME déclaré avant la mise à jour du fabricant ; tout logo falsifié ou non reconnu est immédiatement supprimé. Les anciennes marques sont migrées dans ce référentiel avec leurs logos et leurs matériels.

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

Chaque matériel peut recevoir plusieurs plans de maintenance : préventif, inspection, remplacement, lubrification, nettoyage ou personnalisé. Un plan possède un intervalle en jours, une priorité et la date du dernier entretien. La prochaine échéance est recalculée à la création, à la modification et lors de l’exécution d’un entretien. La case « Intervalle de changement suivant l’usure » enregistre un intervalle à `0` et laisse la prochaine échéance vide ; le plan reste actif et exécutable manuellement. L’API expose `GET|POST /api/v1/maintenance`, `GET|PUT|DELETE /api/v1/maintenance/:uuid`, `PATCH /api/v1/maintenance/:uuid/status`, `POST /api/v1/maintenance/:uuid/execute` et `GET /api/v1/maintenance/:uuid/history`.

La liste des plans accepte une recherche sur le nom, la description, les notes, le matériel et l’opération, ainsi que des filtres par matériel, priorité, type, échéance et statut d’activation. Le filtre d’échéance permet notamment d’isoler les plans « Selon l’usure », affichés sans date ni jours restants. Dans l’interface, ces contrôles utilisent le panneau de filtres partagé. La modale de plan reprend la description de l’opération par défaut et ne révèle le champ « Description spécifique » que lorsque l’utilisateur choisit de la personnaliser ; décocher cette option en édition rétablit la description du catalogue. Depuis l’onglet Maintenance d’un matériel, le bouton `Voir la maintenance` ouvre cette liste préfiltrée sur le matériel concerné et affiche directement tous ses plans.

Une tâche est à faire aujourd’hui lorsque sa prochaine date correspond à la date du jour, en retard lorsque cette date est dépassée, et à prévoir lorsqu’elle tombe dans les 30 prochains jours. Les dates métier sont des valeurs UTC `YYYY-MM-DD`, sans heure. L’exécution met à jour transactionnellement la tâche et son historique.

Lorsqu’un plan possède des pièces, sa modale d’exécution distingue le remplacement normal de l’exécution exceptionnelle sans changement de pièce. Cette seconde action exige une justification et une confirmation explicites, recalcule l’échéance sans consommer le stock et conserve dans l’historique un instantané des pièces non remplacées. L’entrée correspondante est signalée par le libellé rouge « Pièces non remplacées ». La migration `20260815_zzz_add_maintenance_execution_tracking.js` ajoute le type d’exécution et cet instantané aux historiques existants sans modifier leur signification standard.

Les pièces distinguent la quantité disponible en atelier de la quantité déjà commandée. Le badge de stock est calculé à partir de ces deux valeurs et du besoin concerné. La liste de commande agrège les besoins des plans compris dans l’horizon 30, 60, 90 ou 365 jours choisi par l’utilisateur, puis retire le stock atelier et les commandes en cours. La case « Inclure les plans selon usure », décochée par défaut, ajoute une fois les besoins de chaque plan concerné et les identifie dans le détail ; tout changement de filtre recharge automatiquement la liste, sans bouton « Actualiser ». Les ajustements, commandes, réceptions et consommations utilisent un service de stock partagé, transactionnel et historisé. La modale de gestion permet de choisir, pour chaque mouvement de stock et chaque modification de prix, une date métier initialisée à aujourd’hui ; cette date ne peut pas être future et reste distincte de l’horodatage technique de création. Une réception transfère la quantité commandée vers l’atelier ; l’exécution d’un entretien consomme ses pièces et est refusée atomiquement lorsque le stock atelier est insuffisant.

Les plans utilisent `maintenance.read`, `maintenance.create`, `maintenance.update`, `maintenance.delete` et `maintenance.execute`. Les catalogues d’opérations et de pièces utilisent respectivement `maintenance.operations.*` et `maintenance.parts.*`, avec les actions `read`, `create`, `update` et `delete`. Les routes, menus et boutons sont filtrés avec ces mêmes permissions. Le tableau de bord compte les entretiens prévus aujourd’hui, en retard, sous 30 jours et selon l’usure uniquement lorsque l’utilisateur possède `maintenance.read`. Chaque compteur non nul donne accès à la liste exacte des entretiens concernés. Un bouton dans cette liste ouvre la page Maintenance en présélectionnant l’échéance correspondante.

Les intitulés répétitifs sont centralisés dans un catalogue d’opérations accessible via `/api/v1/maintenance/operations`. Les références réellement commandables sont enregistrées dans `/api/v1/maintenance/parts`, puis associées aux plans avec une quantité. Une même opération, par exemple le remplacement d’une bougie, peut ainsi utiliser des références différentes selon le matériel. Dans la modale d’un plan, les pièces sont directement présentées dans une liste paginée ; les sélections et quantités sont conservées pendant la navigation entre les pages. `GET /api/v1/maintenance/order-list` regroupe les quantités nécessaires aux plans arrivant à échéance sur un horizon configurable ou selon un statut d’échéance exact. La modale « Pièces à commander » reprend le filtre d’échéance courant de la page Maintenance à son ouverture ; ses horizons libres restent ensuite modifiables indépendamment. Elle accorde le libellé `pièce` à la quantité et permet d’imprimer une liste dédiée, sans les contrôles de l’interface. L’impression génère autant de pages A4 que nécessaire pour chaque fournisseur, à raison de 13 pièces au maximum par page, avec le bandeau GreenDesk, les plans concernés pour chaque pièce et le footer commun ancré en bas de chaque page. Le fabricant y apparaît sous la pièce en texte secondaire, sans son logo.

L’interface sépare les opérations et les pièces sur les pages `/maintenance/operations` et `/maintenance/parts`. Les fabricants et les fournisseurs sont des référentiels globaux accessibles sur `/manufacturers` et `/suppliers`, avec leurs permissions dédiées. Une pièce référence ainsi un fabricant et un fournisseur enregistrés, en plus de ses références fabricant et fournisseur. La modale de gestion du stock rappelle la référence de la pièce sous son titre.

Les migrations `20260727_zz_add_maintenance_catalogs.js` et `20260727_zzz_add_part_manufacturers_suppliers.js` sont additives : elles conservent les intitulés, les fabricants saisis auparavant et toutes les données historiques des plans. Leur annulation retire uniquement les nouveaux catalogues et leurs associations, ce qui permet de revenir au fonctionnement précédent sans perdre un plan ni son ancien fabricant texte. Les migrations `20260730_add_maintenance_catalog_permissions.js` et `20260730_zz_add_maintenance_plan_permissions.js` ajoutent toutes les permissions de maintenance aux bases existantes ; les attributions génériques déjà présentes sont recopiées vers les catalogues pour préserver les accès lors du déploiement. La migration `20260816_add_wear_based_maintenance.js` rend la prochaine échéance nullable afin de représenter les plans selon l’usure sans valeur calendaire artificielle.

## Configuration

Configurez directement `.env` pour le backend et `frontend/.env` pour l’interface. Ces deux fichiers sont locaux, ignorés par Git et ne doivent jamais être commités. `VITE_API_URL=/api` et `VITE_API_PROXY_TARGET=http://localhost:3000` sont les valeurs de développement usuelles.

`NODE_ENV` est obligatoire et accepte uniquement `development`, `test` ou `production`. En production, GreenDesk refuse de démarrer si les identifiants de base de données, `CORS_ORIGINS` ou `JWT_SECRET` sont absents. `CORS_ORIGINS` contient une ou plusieurs origines HTTP(S) explicites séparées par des virgules, sans chemin, par exemple `https://app.greendesk.fr,https://admin.greendesk.fr`. Les doublons sont supprimés et la valeur `*` est toujours refusée. L’ancien nom `CORS_ORIGIN` reste accepté pour une seule origine pendant la transition, mais les deux variables ne peuvent pas être définies ensemble. Le secret JWT doit contenir au moins 32 octets sans reprendre une valeur d’exemple. Générez un secret aléatoire avec :

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Lors d’une rotation, remplacez `JWT_SECRET` dans le gestionnaire de secrets de chaque instance, redémarrez toutes les instances avec la même nouvelle valeur, vérifiez que les anciens jetons sont refusés, puis reconnectez les utilisateurs. La rotation invalide volontairement toutes les sessions existantes. Ne journalisez, ne partagez et ne committez jamais la valeur générée.

L’inscription publique est active par défaut en développement et désactivée par défaut en production. Pour l’activer explicitement, définissez `PUBLIC_REGISTRATION_ENABLED=true` côté backend et `VITE_PUBLIC_REGISTRATION_ENABLED=true` lors du build frontend. Le backend reste la source d’autorité si les deux valeurs divergent. Un compte issu de l’inscription publique doit vérifier son adresse email avant sa première connexion ; l’activation administrative du compte reste un état distinct. Les comptes déjà présents lors de la migration et ceux créés depuis l’administration sont considérés comme vérifiés.

L’envoi d’emails repose sur un service Nodemailer partagé et un transport SMTP poolé, réutilisable par les futurs modèles de notification. Le fichier `.env.example` présente toutes les variables disponibles. Activez le service avec `MAIL_ENABLED=true`, puis configurez `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` et `APP_PUBLIC_URL`. `SMTP_POOL`, `SMTP_MAX_CONNECTIONS` et `SMTP_MAX_MESSAGES` règlent le pool. `SMTP_USE_SYSTEM_CA=true` fusionne les autorités de certification du système avec celles de Node, sans désactiver la validation TLS.

`SMTP_AUTH_TYPE` accepte `none`, `password` ou `oauth2`. Le mode `password` utilise `SMTP_USER` et `SMTP_PASSWORD`. Le mode `oauth2` exige `SMTP_USER` et soit un `SMTP_OAUTH_ACCESS_TOKEN`, soit le couple `SMTP_OAUTH_CLIENT_ID`/`SMTP_OAUTH_REFRESH_TOKEN` avec `SMTP_OAUTH_ACCESS_URL`. `SMTP_OAUTH_CLIENT_SECRET`, `SMTP_OAUTH_EXPIRES_AT` (timestamp Unix en millisecondes) et `SMTP_OAUTH_SCOPE` sont facultatifs selon le fournisseur. Les secrets OAuth ne doivent jamais être placés dans une variable `VITE_*`, journalisés ou commités.

Pour Outlook.com, utilisez `smtp-mail.outlook.com`, le port `587`, `SMTP_SECURE=false`, l’URL de jeton `https://login.microsoftonline.com/common/oauth2/v2.0/token` et le scope `https://outlook.office.com/SMTP.Send offline_access`. L’application doit être enregistrée dans Microsoft Entra pour les comptes Microsoft personnels, puis le consentement utilisateur doit fournir un refresh token. `SMTP_USER` doit désigner la boîte ayant accordé ce consentement ; `MAIL_FROM_ADDRESS` doit être identique sauf permission explicite d’envoi délégué.

En production, `APP_PUBLIC_URL` doit utiliser HTTPS et l’envoi d’emails est obligatoire lorsque l’inscription publique est active. Les liens de vérification expirent après 24 heures et tous les renvois sont limités à un par minute par compte, y compris depuis l’administration ; ces valeurs se règlent avec `EMAIL_VERIFICATION_TTL_HOURS` et `EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS`. Le bouton de renvoi affiche l’envoi en cours, puis la progression et le temps restant avant de redevenir disponible. Les jetons sont aléatoires, stockés uniquement sous forme de condensat et invalidés après utilisation. Le renvoi depuis l’administration nécessite `users.email_verification.resend`, tandis que la confirmation et le renvoi par l’utilisateur restent publics et soumis au quota dédié.

Toutes les routes `/api` sont limitées à 500 requêtes par adresse IP sur 15 minutes. Les quotas renforcés sont de 10 échecs de connexion sur 15 minutes, 5 inscriptions par heure, 10 demandes de vérification d’email sur 15 minutes et 30 renouvellements de session par utilisateur sur 15 minutes. Ils peuvent être ajustés avec les variables `RATE_LIMIT_*_MAX` ou désactivés localement avec `RATE_LIMIT_ENABLED=false`. Les en-têtes `RateLimit`, `RateLimit-Policy` et `Retry-After` décrivent la limite appliquée. Le store mémoire convient à une instance unique ; un déploiement horizontal devra utiliser un store partagé avant sa mise en service.

`TRUSTED_PROXIES` reste désactivé par défaut. Derrière un reverse proxy, renseignez exclusivement ses adresses ou sous-réseaux fiables séparés par des virgules, par exemple `loopback,10.0.0.0/8`. Les valeurs permissives `true`, `*` et `all` sont refusées afin d’empêcher l’usurpation de `X-Forwarded-For`.

Le seeder est strictement réservé à une base locale en environnement `development`. Il ne crée jamais le schéma : appliquez d’abord toutes les migrations, puis confirmez explicitement la cible locale :

```bash
npm run db:migrate
npm run seed -- --confirm-local-development
```

Sans `GREENDESK_SEED_ADMIN_PASSWORD`, un mot de passe aléatoire est généré, affiché une seule fois et appliqué au compte local configuré par `GREENDESK_SEED_ADMIN_EMAIL`. Une nouvelle exécution renouvelle le mot de passe de ce compte. Pour fournir votre propre secret sans le stocker dans `.env`, définissez temporairement `GREENDESK_SEED_ADMIN_PASSWORD` dans le terminal avant la commande ; il doit contenir au moins 16 octets et ne sera jamais affiché par GreenDesk.

## Lancement

```bash
npm install
npm run db:migrate
npm run seed -- --confirm-local-development
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

Frontend : `cd frontend`, puis `npm test` et `npm run build`. Le build de production applique PurgeCSS aux sources React pour retirer les sélecteurs Bootstrap et GreenDesk inutilisés ; cette purge reste désactivée en développement.

## Architecture

Le backend organise les responsabilités en `routes`, `controller`, `service`, `repository` et `model` sous `src/modules`. Les erreurs traversent le middleware global et les accès sensibles sont protégés par JWT et permissions. Le frontend React se trouve dans `frontend/src` : `auth` gère la session, `api` centralise les appels HTTP, `layouts` l’interface authentifiée et `pages` les écrans.

## Authentification et permissions

La connexion retourne un access token JWT et le profil utilisateur avec ses rôles et permissions. La session est conservée dans le navigateur sans mot de passe, contrôlée à la restauration et supprimée sur expiration ou réponse HTTP 401. Les permissions déterminent les menus, actions et routes, tandis que le backend reste la source d’autorité.

La liste d’administration des utilisateurs exclut les comptes supprimés par défaut. Les utilisateurs qui possèdent `users.read` et `users.deleted.read` disposent du filtre `Supprimés`. La permission indépendante `users.restore` permet d’y restaurer un compte avec son statut, ses rôles et son état de vérification précédents. Toute suppression ou restauration invalide les anciennes sessions du compte.

## Variables d’environnement

Backend : `NODE_ENV`, `PORT`, `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_LOGGING`, `CORS_ORIGINS`, `JWT_SECRET`, `JWT_ACCESS_TOKEN_TTL`, `PUBLIC_REGISTRATION_ENABLED`, `TRUSTED_PROXIES`, `MAIL_ENABLED`, `APP_PUBLIC_URL`, `MAIL_FROM_NAME`, `MAIL_FROM_ADDRESS`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USE_SYSTEM_CA`, `SMTP_AUTH_TYPE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_OAUTH_CLIENT_ID`, `SMTP_OAUTH_CLIENT_SECRET`, `SMTP_OAUTH_REFRESH_TOKEN`, `SMTP_OAUTH_ACCESS_TOKEN`, `SMTP_OAUTH_EXPIRES_AT`, `SMTP_OAUTH_ACCESS_URL`, `SMTP_OAUTH_SCOPE`, `SMTP_POOL`, `SMTP_MAX_CONNECTIONS`, `SMTP_MAX_MESSAGES`, `EMAIL_VERIFICATION_TTL_HOURS`, `EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS`, `RATE_LIMIT_ENABLED`, `RATE_LIMIT_API_MAX`, `RATE_LIMIT_LOGIN_MAX`, `RATE_LIMIT_REGISTER_MAX`, `RATE_LIMIT_EMAIL_VERIFICATION_MAX`, `RATE_LIMIT_REFRESH_MAX`, `GREENDESK_SEED_ADMIN_EMAIL` et, uniquement au moment d’exécuter le seeder, `GREENDESK_SEED_ADMIN_PASSWORD`. Toutes les variables sensibles doivent être injectées par l’environnement ou un gestionnaire de secrets en production.

Frontend : `VITE_API_URL`, par défaut `/api`, `VITE_API_PROXY_TARGET`, par défaut `http://localhost:3000`, et `VITE_PUBLIC_REGISTRATION_ENABLED`, actif hors production et désactivé par défaut dans un build de production.

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

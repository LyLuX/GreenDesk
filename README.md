# GreenDesk

GreenDesk est une application web de gestion de parc matériel et de maintenance, pensée pour les
entreprises qui utilisent et entretiennent des équipements au quotidien, notamment dans les
métiers des espaces verts.

Sa finalité est de réunir dans un même outil les informations souvent dispersées entre fiches
papier, tableaux et documents : matériels en service, caractéristiques, photos, entretiens à
prévoir, pièces nécessaires, état des stocks, coûts et historique des actions réalisées.

La version actuelle de GreenDesk est **9.1.3**.

## Ce que permet GreenDesk

### Travailler dans le contexte d’une société

GreenDesk est multi-sociétés. Un utilisateur peut être rattaché à une ou plusieurs sociétés et
travaille toujours dans le contexte d’une société active. Les matériels, référentiels, plans de
maintenance, stocks et historiques affichés appartiennent à cette société.
Chaque société peut disposer de son propre logo, utilisé dans l’en-tête de l’application et les
documents de maintenance imprimables.

L’administration permet de gérer les sociétés, les utilisateurs, les rôles et les droits d’accès.
Les sociétés et utilisateurs supprimés restent consultables et peuvent être restaurés lorsque
l’utilisateur connecté y est autorisé.

### Décrire et suivre le parc matériel

Chaque matériel possède une fiche qui centralise notamment :

- son nom, sa catégorie, son fabricant et son modèle ;
- son numéro de série, son unité, ses dates de mise en service et de retrait ;
- son prix d’achat, ses notes et son état ;
- ses photos et documents PDF ;
- ses plans de maintenance, ses interventions et son historique.

Les catégories, fabricants et fournisseurs sont gérés comme des référentiels propres à la société.
Un fabricant peut également disposer d’un logo.

### Organiser la maintenance

Les opérations récurrentes sont définies dans un catalogue, puis utilisées pour créer des plans de
maintenance sur les matériels concernés. Un plan peut suivre une périodicité calendaire ou rester
déclenché selon l’usure.

Lors d’une exécution, GreenDesk enregistre l’intervention, recalcule la prochaine échéance et
consomme les pièces prévues. Une exécution exceptionnelle sans remplacement de pièce peut aussi
être tracée avec sa justification. Les interventions non planifiées sont enregistrées séparément
afin de conserver une vision complète des travaux et des coûts réels.

Le tableau de bord met en évidence les entretiens à réaliser aujourd’hui, à venir, en retard ou
selon l’usure. Depuis la page Maintenance, les plans correspondant à une échéance peuvent aussi
être préparés sous forme de fiches de maintenance consultables et imprimables pour les techniciens.

### Gérer les pièces et les stocks

Le catalogue des pièces associe chaque référence à son fabricant, son fournisseur, son prix, son
stock minimum et ses quantités en atelier ou déjà commandées. GreenDesk conserve l’historique des
mouvements et des changements de prix.

Les principales opérations de stock sont prises en charge : ajustement, commande, réception et
consommation. Une liste de pièces à commander peut être calculée à partir des besoins des plans de
maintenance et du stock minimum propre à chaque pièce, puis imprimée par fournisseur.

### Retrouver les liens et l’historique

La page **Relations des entités** représente les enregistrements réels de la société dans un graphe
interactif. Elle permet de partir de la société, de parcourir les matériels, leurs plans, opérations,
pièces et fichiers, puis d’ouvrir directement les fiches disponibles. Deux niveaux de détail sont
proposés pour garder une vue lisible ou explorer les relations plus finement.

Les historiques sont également consultables par domaine : gestion du parc, maintenance et
administration. Ils complètent les historiques détaillés présents sur les fiches des matériels,
plans et pièces.

## Parcours de travail type

1. Sélectionner la société dans laquelle travailler.
2. Créer les catégories, fabricants et fournisseurs utiles.
3. Enregistrer les matériels avec leurs informations, photos et documents.
4. Définir les opérations, les pièces et les plans de maintenance.
5. Suivre les échéances depuis le tableau de bord, exécuter les entretiens et gérer le stock.
6. Consulter les historiques ou le graphe relationnel pour retrouver le contexte complet d’un
   matériel.

## Fonctionnement technique

Les [conventions de développement](docs/conventions.md) précisent l’organisation des modules,
les responsabilités des services, les réponses publiques et la présentation des erreurs.

GreenDesk est composé de deux applications :

- une interface monopage en **React 19**, construite avec **Vite**, **Bootstrap** et React Flow ;
- une API REST en **Node.js 22** et **Express 5**, persistée dans **MySQL** avec **Sequelize**.

Le backend est structuré par modules métier. Chaque module sépare les routes HTTP, la validation,
les contrôleurs, les services, l’accès aux données et les modèles. L’API principale est exposée
sous le préfixe `/api/v1`.

L’authentification utilise des jetons JWT. Le backend applique les autorisations et le contexte de
société à chaque requête protégée ; l’interface adapte ensuite ses routes, menus et actions aux
accès retournés pour l’utilisateur.

Les données structurées sont conservées dans MySQL. Les photos, logos et documents sont stockés
dans le dossier `uploads` et restent accessibles uniquement au travers de routes authentifiées.
Une sauvegarde complète doit donc inclure la base de données et ce dossier.

Les évolutions de la base sont versionnées dans `migrations`. Le contrat OpenAPI décrit les routes
publiques de l’API et alimente Swagger UI en développement et en test.

## Organisation du dépôt

| Emplacement    | Contenu                                            |
| -------------- | -------------------------------------------------- |
| `src/modules`  | Modules métier du backend                          |
| `src/core`     | Composants techniques partagés du backend          |
| `src/config`   | Configuration de l’API et contrat OpenAPI          |
| `frontend/src` | Application React, pages, composants et appels API |
| `migrations`   | Migrations Sequelize et migrations historiques     |
| `tests`        | Tests backend et contrôles transverses             |
| `uploads`      | Fichiers métier créés à l’exécution                |

## Installation locale

### Prérequis

- Node.js 22 ou version ultérieure ;
- npm ;
- une instance MySQL accessible.

### Backend

Depuis la racine du dépôt :

```powershell
npm install
Copy-Item .env.example .env
npm run db:create
npm run db:migrate
```

Le fichier `.env.example` documente la configuration disponible. Pour commencer, il suffit
d’adapter la connexion MySQL, l’origine du frontend et le secret de session. La configuration SMTP
est facultative hors des parcours qui envoient un email.

Le démarrage vérifie l’historique des migrations et ne modifie jamais le schéma.
Après une mise à jour, exécuter `npm run db:migrate:status`, `npm run db:migrate`, puis
`npm run db:schema:check` avant de relancer le backend. Le dernier contrôle vérifie
les colonnes, types, nullabilité, valeurs par défaut déclarées, index et références attendus.
Le socle initial adopte les bases déjà migrées sans recréer leurs tables. Une base non vide
sans historique est refusée et nécessite une reprise manuelle après sauvegarde.
Les deux migrations de régularisation ne sont pas annulables automatiquement ; conserver
une sauvegarde avant leur application. Si une création initiale échoue partiellement,
recréer uniquement la base neuve jetable avant de réessayer, jamais une base contenant des données.

Des données locales de démonstration peuvent être ajoutées en environnement de développement :

```powershell
npm run seed -- --confirm-local-development
```

Le backend se lance ensuite avec :

```powershell
npm run dev
```

### Frontend

Dans un second terminal :

```powershell
Set-Location frontend
npm install
npm run dev
```

Vite transmet par défaut les appels `/api` au backend local. Les éventuelles adaptations
frontend peuvent être placées dans `frontend/.env`.

## Documentation de l’API

Les URL de liste construites par le frontend placent `page`, puis `limit`, puis les autres
paramètres par ordre alphabétique. Par exemple : `/api/v1/companies?page=1&limit=5`.
Le statut actif et le tri par défaut sont appliqués par les requêtes SQL du backend et sont
omis des URL. Les tris existants restent propres à chaque liste (par exemple nom croissant
pour les sociétés et date d’achat décroissante pour les matériels).

Depuis la version 9.0.0, les listes disposant d’un statut retournent les éléments actifs
par défaut. Les clients API qui souhaitent tous les statuts doivent transmettre `active=all` ;
`active=false` sélectionne les éléments inactifs. Les filtres `deleted=true` et
`includeDeleted=true` conservent leurs permissions et désactivent le filtre actif implicite.
Un statut actif explicitement fourni peut toujours être combiné à ces filtres.

Lorsque le backend fonctionne en développement ou en test :

- Swagger UI : `http://localhost:3000/docs` ;
- document OpenAPI : `http://localhost:3000/docs/openapi.json` ;
- état du service : `http://localhost:3000/health`.

La documentation interactive n’est volontairement pas exposée en production.

## Organisation des styles

`frontend/src/styles.css` reste le point d’entrée unique des styles GreenDesk. Il charge Bootstrap,
puis les fichiers de `frontend/src/styles/` : thème, relations, structure, composants partagés,
accès/connexion, tableau de bord, tableaux, stock, maintenance et matériels. Les adaptations
responsive et les règles d’impression sont chargées en dernier pour préserver leurs priorités.

Les couleurs sont définies dans `theme.css`, y compris celles des liens, flèches et points du fond
React Flow. Réutiliser une variable existante avant d’en créer une ; les transparences dérivent
des couleurs de base avec `color-mix()`. Conserver des variables distinctes lorsque les nuances
diffèrent intentionnellement. Les tests CSS suivent les imports et vérifient aussi que la purge
de production conserve les états du graphe et les documents imprimables.

## Journalisation des refus de permissions

Les refus de permissions répétés produisent un avertissement technique
`security.authorization_denied_repeated`, dans les mêmes journaux applicatifs que les dépassements
de quota. Par défaut, le cinquième refus déclenche un événement dans une fenêtre fixe de 60 secondes
ouverte au premier refus, pour un même utilisateur, une même société résolue, une même méthode HTTP
et un même modèle de route. Les UUID des ressources ne divisent pas le compteur. Un seul événement
est émis par groupe et par fenêtre ; `denialCount` indique le nombre atteint au déclenchement,
pas le total final de la fenêtre. Les requêtes autorisées ne sont pas comptées.

`SECURITY_AUTHORIZATION_DENIAL_THRESHOLD` (1 à 1000000, défaut 5) et
`SECURITY_AUTHORIZATION_DENIAL_WINDOW_SECONDS` (1 à 86400, défaut 60) sont modifiables dans le `.env`,
puis prises en compte au redémarrage de l’API. Le compteur est indépendant du rate limiting,
conservé en mémoire par processus et remis à zéro au redémarrage. Il est limité à 10000 groupes :
les groupes expirés sont purgés à la requête suivante et, à saturation, le plus ancien est évincé.
Un déploiement multi-instance nécessite une agrégation externe pour une détection globale.

Ces événements ne sont pas ajoutés à l’historique métier en base : ils sont consultables dans la
sortie de l’API ou son collecteur de logs. Ils incluent l’acteur, la société, la route, les permissions
requises et l’identifiant de corrélation, sans corps de requête, query string, cookie ou jeton.
Les réponses 403, les logs HTTP/erreurs existants et les permissions restent inchangés, même si
l’écriture du nouvel événement échoue. Aucun seuil de stock « inhabituel » n’est introduit.

## Vérification du projet

Le workflow [GreenDesk CI](.github/workflows/ci.yml) exécute automatiquement les contrôles
sur chaque push sur `main` et chaque pull request vers `main`. Il peut aussi être lancé
manuellement depuis l’onglet Actions du dépôt.

Il utilise Node.js 22, installe les deux projets avec `npm ci`, puis lance le lint, les tests
backend (dont la cohérence des versions), le contrôle OpenAPI, les tests frontend et le build
de production. Un second job `Validation MySQL` lance les tests SQL sur un service MySQL 8.4
éphémère. Aucun `.env` local ni secret applicatif n’est nécessaire.

Le lint contrôle les fichiers JavaScript et JSX, les règles React et les dépendances des hooks.
Les tests frontend disposent des environnements Vitest et Node ; le code applicatif utilise
les globals du navigateur. Les PropTypes ne sont pas imposées. Le workflow vérifie également
le formatage Prettier avec `npm run format:check` ; `npm run format` corrige les écarts localement.
Les dépendances, la couverture et le build frontend sont exclus du formatage. Pour rendre les fusions bloquantes, configurer une protection de `main` exigeant une
pull request et les contrôles `Validation GreenDesk` et `Validation MySQL` après sa première exécution réussie.

Depuis la racine :

```powershell
npm test
npm run docs:check
npm run lint
npm run format:check
```

Les tests adverses sur MySQL réel se lancent séparément :

```powershell
npm run test:integration
```

Ils utilisent la connexion `DATABASE_*` du `.env` et nécessitent les droits de créer et
supprimer une base temporaire sur ce serveur MySQL. Aucune base GreenDesk préexistante
n’est nécessaire : les migrations reconstruisent entièrement une base
`greendesk_adversarial_<identifiant aléatoire>`. Le schéma est comparé aux modèles, puis
une mise à niveau avec historique existant et données témoins est vérifiée.
Aucune donnée de la base applicative n’est copiée ou modifiée.
Les données de test sont créées dans cette base isolée, supprimée à la fin même en cas d’échec
des tests. En cas d’arrêt forcé du processus, son nom affiché permet de repérer un éventuel
résidu à supprimer. Un défaut de connexion ou de droits fait échouer la commande, sans ignorer
silencieusement les tests.

Les tests passent par les routes HTTP, l’authentification, les permissions, les services et les
requêtes réels. Ils couvrent le double-clic, la perte de réponse après commit, les appels
concurrents avec clés identiques ou distinctes, la réutilisation d’une clé avec un autre contenu,
le rollback après une panne injectée et l’isolation entre sociétés pour les plans, interventions
et mouvements de stock. La suite habituelle `npm test` reste indépendante de MySQL.

Depuis `frontend` :

```powershell
npm test
npm run lint
npm run build
```

Le build de production du frontend est généré dans `frontend/dist`. L’API ne sert pas
automatiquement ce dossier : en production, l’interface compilée et l’API doivent être publiées par
l’infrastructure choisie, avec le routage de `/api` vers le backend.

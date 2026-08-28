# GreenDesk

GreenDesk est une application web de gestion de parc matériel et de maintenance, pensée pour les
entreprises qui utilisent et entretiennent des équipements au quotidien, notamment dans les
métiers des espaces verts.

Sa finalité est de réunir dans un même outil les informations souvent dispersées entre fiches
papier, tableaux et documents : matériels en service, caractéristiques, photos, entretiens à
prévoir, pièces nécessaires, état des stocks, coûts et historique des actions réalisées.

La version actuelle de GreenDesk est **7.30.1**.

## Ce que permet GreenDesk

### Travailler dans le contexte d’une société

GreenDesk est multi-sociétés. Un utilisateur peut être rattaché à une ou plusieurs sociétés et
travaille toujours dans le contexte d’une société active. Les matériels, référentiels, plans de
maintenance, stocks et historiques affichés appartiennent à cette société.

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
selon l’usure.

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

Lorsque le backend fonctionne en développement ou en test :

- Swagger UI : `http://localhost:3000/docs` ;
- document OpenAPI : `http://localhost:3000/docs/openapi.json` ;
- état du service : `http://localhost:3000/health`.

La documentation interactive n’est volontairement pas exposée en production.

## Vérification du projet

Depuis la racine :

```powershell
npm test
npm run docs:check
npm run lint
npm run format:check
```

Depuis `frontend` :

```powershell
npm test
npm run lint
npm run build
```

Le build de production du frontend est généré dans `frontend/dist`. L’API ne sert pas
automatiquement ce dossier : en production, l’interface compilée et l’API doivent être publiées par
l’infrastructure choisie, avec le routage de `/api` vers le backend.

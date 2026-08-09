# Roadmap de correction des audits GreenDesk des 2 et 9 août 2026

J’ai confronté l’audit du 2 août, réalisé sur GreenDesk v1.15.3, et celui du 9 août, réalisé sur GreenDesk v4.4.0, à GreenDesk v4.4.3. Les failles critiques relevées par le premier audit et les évolutions fonctionnelles récentes ont déjà été traitées. Le système de migrations reste le principal risque technique actif.

## Roadmap recommandée

| Priorité | Correction                           | Sévérité | Taille |
| -------- | ------------------------------------ | -------: | -----: |
| 1        | Unification du système de migrations |    Haute |      L |
| 2        | Intégration continue obligatoire     |    Haute |      M |

### 1. Rendre les migrations fiables

Le projet mélange :

- deux migrations SQL historiques ;
- des migrations JavaScript suivies par Sequelize CLI ;
- `sequelize.sync()` en développement dans [server.js](../src/server.js#L13).

Une base vide ne peut pas être reconstruite de manière certaine uniquement avec `npm run db:migrate`. De plus, `sequelize.sync()` peut masquer une migration manquante et faire diverger les environnements.

À faire dans cet ordre :

1. Définir un baseline JavaScript canonique.
2. Prévoir l’adoption du baseline par les bases existantes sans recréer leurs tables.
3. Tester la reconstruction d’une base totalement vide.
4. Comparer le schéma obtenu au schéma attendu.
5. Retirer ensuite tous les `sequelize.sync()`.
6. Ajouter le test de reconstruction à la CI.

### 2. Ajouter une CI bloquante

Le constat des audits indiquant que les tests n’avaient pas été exécutés est désormais dépassé : les validations de la v4.4.3 passent localement avec les tests backend et frontend, le contrôle OpenAPI et le build de production.

En revanche, aucun workflow CI n’impose encore ces contrôles.

La CI devrait exécuter :

- installation reproductible ;
- lint backend et frontend ;
- tests backend et frontend ;
- `npm run docs:check` ;
- test de cohérence des versions ;
- build frontend ;
- reconstruction d’une base vide par migrations.

## Constats du nouvel audit sans correction active

- Le décalage de version du README observé sur la copie auditée est déjà corrigé. La version est synchronisée entre les métadonnées backend et frontend, les lockfiles, le README, la santé, le pied de page et OpenAPI, puis contrôlée automatiquement.
- La migration vers Sequelize v7 reste volontairement hors périmètre. Elle ne sera pas réintroduite dans cette roadmap sans nouvelle décision du projet.
- Le stockage en mémoire du rate limiter convient au fonctionnement local et mono-instance actuel, puisqu’il n’existe pas encore de production ou de préproduction. Un stockage partagé et une stratégie de panne deviendront un prérequis avant tout déploiement horizontal.
- La centralisation de la table des routes frontend est un constat de faible sévérité. Les pages sont déjà chargées avec `React.lazy` et aucun problème fonctionnel ne justifie actuellement un chantier supplémentaire.

## Éléments déjà améliorés depuis les audits

- Helmet est configuré avec une CSP restrictive et des directives secondaires durcies.
- Les stratégies de cache développement et production sont testées.
- La compression utilise le réglage équilibré validé par benchmark.
- Les URL Blob des images sont correctement révoquées et les requêtes identiques sont dédupliquées.
- Les tests, OpenAPI et le build de production sont validés à chaque livraison.
- Les transactions sont limitées aux unités d’écriture des services. Les données métier et leur audit partagent la même transaction, tandis que les lectures concurrentes n’occupent plus le pool avec des transactions inutiles.
- Plusieurs pages auparavant centralisées ont déjà été extraites.
- Le stock atelier et les commandes sont séparés, historisés et modifiés atomiquement par un service réutilisable ; l’exécution d’un entretien consomme désormais ses pièces.

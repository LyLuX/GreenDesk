# Roadmap de correction des audits GreenDesk des 2 et 9 août 2026

J’ai confronté l’audit du 2 août, réalisé sur GreenDesk v1.15.3, et celui du 9 août, réalisé sur GreenDesk v4.4.0, à GreenDesk v4.4.2. Les failles critiques relevées par le premier audit et les évolutions fonctionnelles récentes ont déjà été traitées. Les risques les plus importants encore présents concernent le système de migrations et la transaction globale appliquée à toutes les routes API.

## Roadmap recommandée

| Priorité | Correction                                      | Sévérité | Taille |
| -------- | ----------------------------------------------- | -------: | -----: |
| 1        | Unification du système de migrations            |    Haute |      L |
| 2        | Transactions limitées aux unités d’écriture     |    Haute |      L |
| 3        | Intégration continue obligatoire                |    Haute |      M |

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

### 2. Limiter les transactions aux unités d’écriture

Le middleware global de [app.js](../src/app.js) ouvre actuellement une transaction `READ COMMITTED` pour chaque requête sous `/api`, y compris les lectures. Avec un pool limité à dix connexions, les requêtes `GET` consomment inutilement une connexion et exécutent un `BEGIN` puis un `COMMIT`, ce qui réduira la capacité de montée en charge.

Ce middleware garantit toutefois aujourd’hui que certaines modifications métier et leur journal d’audit restent atomiques. Il ne doit donc pas être retiré avant d’avoir sécurisé chaque chemin d’écriture.

À faire dans cet ordre :

1. Inventorier toutes les écritures et leur dépendance au contexte transactionnel de la requête.
2. Regrouper explicitement chaque modification métier et son audit dans une même unité de travail au niveau service.
3. Conserver un mécanisme transactionnel réutilisable pour les appels imbriqués, sans dupliquer la gestion des transactions dans les contrôleurs.
4. Ajouter des tests d’atomicité vérifiant que les données métier et l’audit sont annulés ensemble en cas d’échec.
5. Retirer la transaction globale des routes de lecture, puis supprimer le middleware global lorsque toutes les écritures sont couvertes.
6. Ajouter un test garantissant qu’une requête `GET` n’ouvre aucune transaction.
7. Mesurer la concurrence sur des lectures représentatives et vérifier la latence ainsi que l’utilisation du pool avant et après la correction.

### 3. Ajouter une CI bloquante

Le constat des audits indiquant que les tests n’avaient pas été exécutés est désormais dépassé : les validations de la v4.4.2 passent localement avec les tests backend et frontend, le contrôle OpenAPI et le build de production.

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
- Plusieurs pages auparavant centralisées ont déjà été extraites.
- Le stock atelier et les commandes sont séparés, historisés et modifiés atomiquement par un service réutilisable ; l’exécution d’un entretien consomme désormais ses pièces.

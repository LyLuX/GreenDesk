# Roadmap de correction de l’audit GreenDesk du 2 août 2026

J’ai confronté l’audit du 2 août, réalisé sur GreenDesk v1.15.3, à GreenDesk v4.4.0. Conclusion : le système de migrations reste le risque technique le plus grave.

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

Une base vide ne peut pas être reconstruite de manière certaine uniquement avec `npm run db:migrate`.

À faire dans cet ordre :

1. Définir un baseline JavaScript canonique.
2. Prévoir l’adoption du baseline par les bases existantes sans rejouer les tables.
3. Tester la reconstruction d’une base totalement vide.
4. Comparer le schéma obtenu au schéma attendu.
5. Retirer ensuite tous les `sequelize.sync()`.
6. Ajouter ce test à la CI.

### 2. Ajouter une CI bloquante

Le constat de l’audit indiquant que les tests n’avaient pas été exécutés est désormais dépassé : les validations de la v4.4.0 passent, avec 208 tests backend, 122 tests frontend, le contrôle OpenAPI et le build de production.

En revanche, aucun workflow CI n’impose encore ces contrôles.

La CI devrait exécuter :

- installation reproductible ;
- lint backend et frontend ;
- tests backend et frontend ;
- `npm run docs:check` ;
- test de cohérence des versions ;
- build frontend ;
- reconstruction d’une base vide par migrations.

## Éléments déjà améliorés depuis l’audit

- Helmet est désormais configuré avec une CSP restrictive.
- Les stratégies de cache développement/production sont testées.
- La compression utilise le réglage équilibré validé par benchmark.
- Les URL Blob des images sont correctement révoquées et les requêtes identiques sont dédupliquées.
- Les tests, OpenAPI et le build de production ont été validés.
- Plusieurs pages auparavant centralisées ont déjà été extraites.
- Le stock atelier et les commandes sont séparés, historisés et modifiés atomiquement par un service réutilisable ; l’exécution d’un entretien consomme désormais ses pièces.

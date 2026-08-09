# Roadmap de correction de l’audit GreenDesk du 2 août 2026

J’ai confronté l’audit du 2 août, réalisé sur GreenDesk v1.15.3, à GreenDesk v4.3.3. Conclusion : le système de migrations reste le risque technique le plus grave. La nouvelle gestion de stock introduit également un risque important de cohérence métier.

## Roadmap recommandée

| Priorité | Correction                           | Sévérité | Taille |
| -------- | ------------------------------------ | -------: | -----: |
| 1        | Unification du système de migrations |    Haute |      L |
| 2        | Refonte minimale du modèle de stock  |    Haute |      L |
| 3        | Intégration continue obligatoire     |    Haute |      M |

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

Cette étape doit précéder la refonte du stock afin que sa migration soit fiable.

### 2. Corriger le modèle de stock

C’est le principal risque apparu avec les fonctionnalités ajoutées aujourd’hui.

Le modèle actuel stocke un statut exclusif et une quantité unique dans [maintenance-part.model.js](../src/modules/maintenance/model/maintenance-part.model.js#L34). Cela ne permet pas de représenter simultanément :

- une quantité disponible en atelier ;
- une quantité déjà commandée.

De plus, l’exécution d’une maintenance ne consomme actuellement aucune pièce dans [maintenance.service.js](../src/modules/maintenance/service/maintenance.service.js#L204). Le stock peut donc rester artificiellement suffisant et masquer de futurs besoins.

Modèle minimal recommandé :

- `quantityOnHand` : quantité réellement disponible ;
- `quantityOnOrder` : quantité commandée mais non reçue ;
- statut affiché calculé, et non utilisé comme source de vérité ;
- opérations atomiques : ajustement, commande, réception, consommation ;
- service de stock réutilisable par d’autres modèles.

Pour un besoin donné :

```text
à commander = max(besoin - quantité en stock - quantité commandée, 0)
```

Le badge serait calculé ainsi :

- `À commander` si un manque subsiste ;
- `En stock` si le stock atelier couvre le besoin ;
- `Commandée` si le besoin restant est couvert par une commande.

Il faudra aussi :

- migrer les valeurs actuelles ;
- consommer les pièces lors de l’exécution d’une maintenance ;
- déplacer les quantités commandées vers le stock lors de leur réception ;
- sécuriser les modifications concurrentes par transaction/verrouillage ;
- ajouter des contraintes DB et un historique des mouvements ;
- définir explicitement la règle concernant l’horizon 30/60/90/365 jours avant implémentation.

### 3. Ajouter une CI bloquante

Le constat de l’audit indiquant que les tests n’avaient pas été exécutés est désormais dépassé : les validations de la v4.3.3 passent, avec 200 tests backend, 121 tests frontend, le contrôle OpenAPI et le build de production.

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

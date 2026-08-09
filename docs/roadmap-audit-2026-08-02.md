# Roadmap de correction de l’audit GreenDesk du 2 août 2026

J’ai confronté l’audit du 2 août, réalisé sur GreenDesk v1.15.3, à GreenDesk v1.20.3. Conclusion : le système de migrations reste le risque technique le plus grave. La nouvelle gestion de stock introduit également un risque important de cohérence métier.

## Roadmap recommandée

| Priorité | Correction                                | Sévérité | Taille |
| -------- | ----------------------------------------- | -------: | -----: |
| 1        | Unification du système de migrations      |    Haute |      L |
| 2        | Refonte minimale du modèle de stock       |    Haute |      L |
| 3        | Intégration continue obligatoire          |    Haute |      M |
| 4        | Validation réelle des fichiers téléversés |  Modérée |      M |
| 5        | Optimisations frontend et maintenance     |  Modérée |    M/L |
| 6        | Refactorings structurels et Sequelize v7  |    Basse |      L |

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

Le constat de l’audit indiquant que les tests n’avaient pas été exécutés est désormais dépassé : les validations de la v4.2.0 passent, avec 187 tests backend, 118 tests frontend, le contrôle OpenAPI et le build de production.

En revanche, aucun workflow CI n’impose encore ces contrôles.

La CI devrait exécuter :

- installation reproductible ;
- lint backend et frontend ;
- tests backend et frontend ;
- `npm run docs:check` ;
- test de cohérence des versions ;
- build frontend ;
- reconstruction d’une base vide par migrations.

### 4. Vérifier le contenu réel des fichiers

Les uploads sont protégés, limités en taille et stockés sous des noms UUID, ce qui est positif. Mais le type est déterminé depuis le MIME déclaré par le client.

Ajouter une vérification des signatures binaires — magic bytes — avant conservation du fichier, avec suppression immédiate des fichiers rejetés et tests de MIME falsifié.

### 5. Optimisations après sécurisation

Les constats de performance restent globalement valides :

- toutes les pages sont importées statiquement dans [App.jsx](../frontend/src/App.jsx#L11) ;
- les recherches de maintenance utilisent plusieurs requêtes et associations ;
- certaines listes ne sont pas paginées ;
- les images protégées génèrent une requête authentifiée par image.

Ordre conseillé :

1. Découpage des routes avec `React.lazy`.
2. Extraction de la configuration de la page Matériels hors de `App.jsx`.
3. Mesures SQL avec un volume représentatif.
4. Pagination ou endpoints légers pour les catalogues.
5. Optimisation de la liste de commandes seulement si les mesures le justifient.
6. Déduplication/cache des images authentifiées si leur volume devient problématique.

Le niveau `9` de compression mérite également un benchmark : il peut consommer davantage de CPU pour un gain réseau faible.

### 6. Reporter Sequelize v7 et les grands refactorings

Je ne recommande pas de migrer maintenant. La documentation officielle décrit toujours Sequelize v7 comme une version alpha et recommande `@sequelize/core@alpha`. La remarque de l’audit affirmant que la CLI n’était pas prête est toutefois à revalider, car la documentation v7 actuelle comporte désormais une section CLI : [Sequelize v7](https://sequelize.org/docs/v7/), [installation](https://sequelize.org/docs/v7/getting-started/), [CLI](https://sequelize.org/docs/v7/cli/).

Les abstractions CRUD et la réduction de `App.jsx` pourront ensuite être réalisées progressivement, sans refonte globale.

## Éléments déjà améliorés depuis l’audit

- Helmet est désormais configuré avec une CSP restrictive.
- Les stratégies de cache développement/production sont testées.
- La compression est configurée.
- Les URL Blob des images sont correctement révoquées.
- Les tests, OpenAPI et le build de production ont été validés.
- Plusieurs pages auparavant centralisées ont déjà été extraites.

Il reste un durcissement CSP secondaire : supprimer progressivement `'unsafe-inline'` de `styleSrc`, après avoir éliminé les styles inline compatibles.

Aucun fichier du dépôt n’a été modifié pendant cette analyse. Le dossier temporaire utilisé pour lire le PDF a été supprimé.

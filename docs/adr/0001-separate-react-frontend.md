# ADR 0001: Frontend React séparé

## Décision

Le frontend Vite est placé dans `frontend/`, séparé de l'API Express dans `src/`.

## Contexte

Le backend existant est une application Node.js autonome. Mélanger les artefacts Vite
et ses dépendances avec ses modules métier compliquerait les scripts, les tests et les
déploiements futurs.

## Conséquences

Le frontend consomme l'API via Axios avec le préfixe `/api`. Chaque application garde
son propre `package.json` et peut être démarrée indépendamment.

# GreenDesk

Backend Node.js et frontend React pour la gestion de parc matériel des espaces verts.

## Modules disponibles

Authentification, utilisateurs, rôles, permissions, audit, catégories, propriétés et matériaux.

## API Sprint 3

- `GET|POST /api/categories`, `GET|PUT /api/categories/:uuid`, `PATCH /api/categories/:uuid/status`
- `GET|POST /api/properties`, `GET|PUT /api/properties/:uuid`, `PATCH /api/properties/:uuid/status`
- `GET|POST /api/materials`, `GET|PUT /api/materials/:uuid`, `PATCH /api/materials/:uuid/status`

Les permissions ajoutées sont `categories.*`, `properties.*` et `materials.*` avec les actions `read`, `create`, `update`, `disable`.

## Lancement

```bash
npm install
npm run seed
npm run dev
cd frontend
npm install
npm run dev
```

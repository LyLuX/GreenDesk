# GreenDesk contributor instructions

- Keep every change strictly scoped to the user's request. Do not modify files, behavior, or
  features that are unrelated to the requested outcome.
- Prefer reusable, readable, and maintainable code. Extract shared components or helpers when they
  reduce duplication without expanding the requested scope.
- Always use GreenDesk's existing permission system for protected features. Apply the matching
  permission consistently to API routes, frontend routes, navigation, and user actions; do not
  bypass authorization or add a redundant permission when an existing permission covers the
  action.
- Keep the OpenAPI contract synchronized with every API route, parameter, request body, response,
  permission, status code, and public data-field change.
- Update `src/config/openapi-paths.js` and `src/config/openapi-components.js` in the same change as
  the affected API code.
- Run `npm run docs:check` before committing. Do not merge an API change while this check fails.
- Whenever a change affects the database schema, reference data, permissions, or persisted data,
  verify that the required migration exists and correctly covers existing databases. Run
  `npm run db:migrate:status`, execute pending migrations with `npm run db:migrate`, then verify
  both the final migration status and the resulting schema or data before finishing the change.

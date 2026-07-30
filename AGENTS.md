# GreenDesk contributor instructions

- Keep every change strictly scoped to the user's request. Do not modify files, behavior, or
  features that are unrelated to the requested outcome.
- Prefer reusable, readable, and maintainable code. Extract shared components or helpers when they
  reduce duplication without expanding the requested scope.
- Keep visual formatting and interaction patterns consistent across the entire application for
  every change. Reuse the existing shared components, Bootstrap structures, labels, action colors,
  spacing, confirmation dialogs, and responsive behavior whenever an equivalent pattern already
  exists.
- Make every new or modified UI element user-friendly by default. Keep primary actions visible and
  reachable, prevent content and controls from escaping the viewport, preserve responsive and
  keyboard-accessible behavior, and provide clear labels, states, feedback, and consequences.
- Increment GreenDesk's semantic version for every delivered change before committing and pushing:
  use `PATCH` for a backward-compatible fix, `MINOR` for a backward-compatible feature, and `MAJOR`
  for a breaking change. Never leave a delivered commit on the previous version.
- Keep the version identical in the backend and frontend `package.json` files, both lockfiles, the
  README current-version statement, the health endpoint, the frontend footer, and Swagger/OpenAPI.
  The runtime values derive from package metadata, but verify them with `tests/versioning.test.js`.
- Run the backend tests and frontend tests, then generate the production frontend build after every
  version change and before committing or pushing.
- Always use GreenDesk's existing permission system for protected features. Apply the matching
  permission consistently to API routes, frontend routes, navigation, and user actions; do not
  bypass authorization or add a redundant permission when an existing permission covers the
  action.
- Keep the OpenAPI contract synchronized with every API route, parameter, request body, response,
  permission, status code, and public data-field change.
- Update `src/config/openapi-paths.js` and `src/config/openapi-components.js` in the same change as
  the affected API code.
- Treat Swagger/OpenAPI synchronization as a release blocker. Run `npm run docs:check` before every
  commit, including frontend-only releases whose shared application version changes, and never
  commit or push while this check fails.
- Whenever a change affects the database schema, reference data, permissions, or persisted data,
  verify that the required migration exists and correctly covers existing databases. Run
  `npm run db:migrate:status`, execute pending migrations with `npm run db:migrate`, then verify
  both the final migration status and the resulting schema or data before finishing the change.

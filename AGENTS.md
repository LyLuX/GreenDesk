# GreenDesk contributor instructions

- Keep every change strictly scoped to the user's request. Do not modify files, behavior, or
  features that are unrelated to the requested outcome.
- Prefer reusable, readable, and maintainable code. Extract shared components or helpers when they
  reduce duplication without expanding the requested scope.
- Keep the OpenAPI contract synchronized with every API route, parameter, request body, response,
  permission, status code, and public data-field change.
- Update `src/config/openapi-paths.js` and `src/config/openapi-components.js` in the same change as
  the affected API code.
- Run `npm run docs:check` before committing. Do not merge an API change while this check fails.

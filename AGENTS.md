# GreenDesk contributor instructions

- Keep the OpenAPI contract synchronized with every API route, parameter, request body, response,
  permission, status code, and public data-field change.
- Update `src/config/openapi-paths.js` and `src/config/openapi-components.js` in the same change as
  the affected API code.
- Run `npm run docs:check` before committing. Do not merge an API change while this check fails.

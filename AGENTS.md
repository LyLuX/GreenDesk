# GreenDesk contributor instructions

- Keep every change strictly scoped to the user's request. Do not modify files, behavior, or
  features that are unrelated to the requested outcome.
- Never run GreenDesk npm scripts that start a server, watcher, or other persistent runtime
  process, including `npm run dev`, `npm run dev:lan`, `npm start`, and `npm run start`. The user
  manages these processes from an external command prompt. Non-server scripts such as tests,
  linting, documentation checks, builds, and migrations may still be run by agents as required.
- Prefer reusable, readable, and maintainable code. Extract shared components or helpers when they
  reduce duplication without expanding the requested scope.
- Keep visual formatting and interaction patterns consistent across the entire application for
  every change. Reuse the existing shared components, Bootstrap structures, labels, action colors,
  spacing, confirmation dialogs, and responsive behavior whenever an equivalent pattern already
  exists.
- Define every badge color through GreenDesk or Bootstrap theme variables. When a badge needs a
  tint or shade, derive it with `color-mix()` using only theme variables; never hard-code a color
  in a badge rule.
- Make every new or modified UI element user-friendly by default. Keep primary actions visible and
  reachable, prevent content and controls from escaping the viewport, preserve responsive and
  keyboard-accessible behavior, and provide clear labels, states, feedback, and consequences.
- Treat one independently requested and completed user outcome as one product modification. Fixes,
  test adjustments, and follow-up work needed to complete that same outcome do not count as separate
  modifications. Classify each modification as `PATCH` for a backward-compatible fix or small
  improvement, `MINOR` for a backward-compatible feature, or `MAJOR` for a breaking change.
- Keep a persistent French release note for every completed product modification in `CHANGELOG.md`
  under `## Non publié`, prefixed with its level (`[PATCH]`, `[MINOR]`, or `[MAJOR]`). Create the file
  and section when the first modification is queued. Each entry must concisely describe the
  user-visible outcome rather than implementation details.
- Batch releases according to the highest level currently present under `## Non publié`: release
  five queued modifications when all are `PATCH`, release three queued modifications when at least
  one is `MINOR`, and release immediately when a `MAJOR` modification is completed. A user may
  explicitly request an earlier release. Until a release threshold is reached, do not increment the
  application version, create an intermediate commit, or push the queued product modifications.
- Before a release threshold is reached, run checks proportionate to each modification and report
  its release-note text, level, current queue count, and remaining threshold to the user. At the
  start of later work, inspect both `CHANGELOG.md` and the working tree to recover the pending batch;
  preserve any unlisted or unrelated user changes.
- When a release is triggered, increment GreenDesk's semantic version once according to the highest
  queued level, move the pending notes to a section named with the new version and release date, and
  create a fresh empty `## Non publié` section. Include the whole validated batch in one focused
  commit, then push it to the current branch. If the batch cannot be committed or pushed safely,
  report the blocker instead of silently leaving a release unpublished.
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

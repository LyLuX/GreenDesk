/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Registers a user with the default USER role.
 *     requestBody: { required: true }
 *     responses: { 201: { description: User created }, 400: { description: Invalid input }, 409: { description: Email already used } }
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticates a user and returns a 15-minute access token.
 *     responses: { 200: { description: Access token and user profile }, 401: { description: Invalid credentials } }
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Revokes the current access token.
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Token revoked }, 401: { description: Authentication is required } }
 */
export const authOpenApi = true;

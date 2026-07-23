/**
 * @openapi
 * /users:
 *   get: { tags: [Users], security: [{ bearerAuth: [] }], summary: List users, responses: { 200: { description: Users } } }
 *   post: { tags: [Users], security: [{ bearerAuth: [] }], summary: Create a user, responses: { 201: { description: User created } } }
 * /users/{uuid}:
 *   get: { tags: [Users], security: [{ bearerAuth: [] }], summary: Get a user, responses: { 200: { description: User } } }
 *   put: { tags: [Users], security: [{ bearerAuth: [] }], summary: Update a user, responses: { 200: { description: User updated } } }
 *   delete: { tags: [Users], security: [{ bearerAuth: [] }], summary: Soft delete a user, responses: { 204: { description: User deleted } } }
 */
export const usersOpenApi = true;

/**
 * @openapi
 * /permissions:
 *   get: { tags: [Permissions], security: [{ bearerAuth: [] }], summary: List permissions, responses: { 200: { description: Permissions } } }
 *   post: { tags: [Permissions], security: [{ bearerAuth: [] }], summary: Create a permission, responses: { 201: { description: Permission created } } }
 * /permissions/{uuid}:
 *   put: { tags: [Permissions], security: [{ bearerAuth: [] }], summary: Update a permission, responses: { 200: { description: Permission updated } } }
 *   delete: { tags: [Permissions], security: [{ bearerAuth: [] }], summary: Soft delete a permission, responses: { 204: { description: Permission deleted } } }
 */
export const permissionsOpenApi = true;

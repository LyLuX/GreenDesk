/**
 * @openapi
 * /roles:
 *   get: { tags: [Roles], security: [{ bearerAuth: [] }], summary: List roles, responses: { 200: { description: Roles } } }
 *   post: { tags: [Roles], security: [{ bearerAuth: [] }], summary: Create a role, responses: { 201: { description: Role created } } }
 * /roles/{uuid}:
 *   put: { tags: [Roles], security: [{ bearerAuth: [] }], summary: Update a role, responses: { 200: { description: Role updated } } }
 *   delete: { tags: [Roles], security: [{ bearerAuth: [] }], summary: Soft delete a role, responses: { 204: { description: Role deleted } } }
 */
export const rolesOpenApi = true;

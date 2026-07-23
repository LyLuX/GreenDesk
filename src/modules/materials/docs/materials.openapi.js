/** @openapi
 * /materials:
 *   get: { tags: [Materials], summary: List materials, security: [{ bearerAuth: [] }], responses: { 200: { description: Materials } } }
 *   post: { tags: [Materials], summary: Create a material, security: [{ bearerAuth: [] }], responses: { 201: { description: Created } } }
 */
export const materialsOpenApi = true;

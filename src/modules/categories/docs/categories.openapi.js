/** @openapi
 * /categories:
 *   get: { tags: [Categories], summary: List categories, security: [{ bearerAuth: [] }], responses: { 200: { description: Categories } } }
 *   post: { tags: [Categories], summary: Create a category, security: [{ bearerAuth: [] }], responses: { 201: { description: Created } } }
 * /categories/{uuid}:
 *   delete: { tags: [Categories], summary: Soft-delete a category, security: [{ bearerAuth: [] }], responses: { 204: { description: Deleted }, 403: { description: categories.delete is required }, 404: { description: Not found } } }
 */
export const categoriesOpenApi = true;

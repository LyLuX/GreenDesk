/** @openapi
 * /properties:
 *   get: { tags: [Properties], summary: List properties, security: [{ bearerAuth: [] }], responses: { 200: { description: Properties } } }
 *   post: { tags: [Properties], summary: Create a property, security: [{ bearerAuth: [] }], responses: { 201: { description: Created } } }
 * /properties/{uuid}:
 *   delete: { tags: [Properties], summary: Soft-delete a property, security: [{ bearerAuth: [] }], responses: { 204: { description: Deleted }, 403: { description: properties.delete is required }, 404: { description: Not found } } }
 */
export const propertiesOpenApi = true;

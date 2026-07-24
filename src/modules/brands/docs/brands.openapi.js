/** @openapi
 * /brands:
 *   get: { tags: [Brands], summary: List brands, security: [{ bearerAuth: [] }], responses: { 200: { description: Brands } } }
 *   post: { tags: [Brands], summary: Create a brand, security: [{ bearerAuth: [] }], responses: { 201: { description: Created }, 409: { description: Name already exists } } }
 * /brands/{uuid}:
 *   put: { tags: [Brands], summary: Update a brand, security: [{ bearerAuth: [] }], responses: { 200: { description: Updated } } }
 *   delete: { tags: [Brands], summary: Soft-delete a brand, security: [{ bearerAuth: [] }], responses: { 204: { description: Deleted }, 403: { description: brands.delete is required } } }
 */
export const brandsOpenApi = true;

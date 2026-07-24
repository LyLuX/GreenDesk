/** @openapi
 * /brands:
 *   get: { tags: [Brands], summary: List brands, security: [{ bearerAuth: [] }], responses: { 200: { description: Brands } } }
 *   post: { tags: [Brands], summary: Create a brand, security: [{ bearerAuth: [] }], responses: { 201: { description: Created }, 409: { description: Name already exists } } }
 * /brands/{uuid}:
 *   put: { tags: [Brands], summary: Update a brand, security: [{ bearerAuth: [] }], responses: { 200: { description: Updated } } }
 *   delete: { tags: [Brands], summary: Soft-delete a brand, security: [{ bearerAuth: [] }], responses: { 204: { description: Deleted }, 403: { description: brands.delete is required } } }
 * /brands/{uuid}/logo:
 *   get: { tags: [Brands], summary: View the protected brand logo, security: [{ bearerAuth: [] }], responses: { 200: { description: Image stream }, 404: { description: Logo not found } } }
 *   post: { tags: [Brands], summary: Upload or replace a JPEG, PNG or WebP logo (2 MB maximum), security: [{ bearerAuth: [] }], responses: { 200: { description: Logo updated }, 400: { description: Invalid image } } }
 *   delete: { tags: [Brands], summary: Remove the brand logo, security: [{ bearerAuth: [] }], responses: { 200: { description: Logo removed } } }
 */
export const brandsOpenApi = true;

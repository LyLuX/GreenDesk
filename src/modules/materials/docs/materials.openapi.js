/** @openapi
 * /materials:
 *   get:
 *     tags: [Materials]
 *     summary: List materials with filtering, sorting and pagination.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: active, schema: { type: boolean } }
 *       - { in: query, name: brandUuid, schema: { type: string, format: uuid } }
 *       - { in: query, name: categoryUuid, schema: { type: string, format: uuid } }
 *       - { in: query, name: propertyUuid, schema: { type: string, format: uuid } }
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100 } }
 *       - { in: query, name: sort, schema: { type: string, enum: [name, reference, purchasePrice, purchaseDate, engineHours] } }
 *       - { in: query, name: direction, schema: { type: string, enum: [ASC, DESC] } }
 *     responses: { 200: { description: Paginated public material records }, 401: { description: Authentication required }, 403: { description: materials.read permission required } }
 *   post:
 *     tags: [Materials]
 *     summary: Create a material using public relation UUIDs.
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Created }, 409: { description: Duplicate name, reference or serial number } }
 * /materials/{uuid}:
 *   get: { tags: [Materials], summary: Get a material, security: [{ bearerAuth: [] }], responses: { 200: { description: Material detail } } }
 *   put: { tags: [Materials], summary: Update a material, security: [{ bearerAuth: [] }], responses: { 200: { description: Updated } } }
 * /materials/{uuid}/history:
 *   get: { tags: [Materials], summary: Get the material audit history, security: [{ bearerAuth: [] }], responses: { 200: { description: Audit events } } }
 * /materials/{uuid}/photos:
 *   post: { tags: [Material files], summary: Upload a JPEG, PNG or WebP photo (10 MB, 10 photos maximum), security: [{ bearerAuth: [] }], responses: { 201: { description: Uploaded }, 400: { description: Missing, invalid or oversized file } } }
 * /materials/{uuid}/documents:
 *   post: { tags: [Material files], summary: Upload a PDF document, security: [{ bearerAuth: [] }], responses: { 201: { description: Uploaded } } }
 * /materials/files/{fileUuid}/download:
 *   get: { tags: [Material files], summary: Download a protected material file, security: [{ bearerAuth: [] }], responses: { 200: { description: File stream } } }
 */
export const materialsOpenApi = true;

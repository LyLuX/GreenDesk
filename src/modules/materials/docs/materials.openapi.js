/** @openapi
 * components:
 *   schemas:
 *     MaterialFile:
 *       type: object
 *       required: [uuid, kind, originalName, mimeType, size]
 *       properties:
 *         uuid: { type: string, format: uuid }
 *         kind: { type: string, enum: [photo, document] }
 *         documentType: { type: string, enum: [invoice, manual, certificate, other], nullable: true }
 *         originalName: { type: string, example: manuel-tondeuse.pdf }
 *         mimeType: { type: string, example: application/pdf }
 *         size: { type: integer, example: 24580 }
 *         isPrimary: { type: boolean }
 * /materials:
 *   get:
 *     tags: [Materials]
 *     summary: List materials using public UUID filters and pagination.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: active, schema: { type: boolean } }
 *       - { in: query, name: brandUuid, schema: { type: string, format: uuid } }
 *       - { in: query, name: categoryUuid, schema: { type: string, format: uuid } }
 *       - { in: query, name: propertyUuid, schema: { type: string, format: uuid } }
 *       - { in: query, name: page, schema: { type: integer, minimum: 1, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100, default: 25 } }
 *       - { in: query, name: sort, schema: { type: string, enum: [name, reference, purchasePrice, purchaseDate, engineHours] } }
 *       - { in: query, name: direction, schema: { type: string, enum: [ASC, DESC] } }
 *     responses: { 200: { description: Paginated material records }, 401: { description: Authentication required }, 403: { description: materials.read is required } }
 *   post:
 *     tags: [Materials]
 *     summary: Create a material.
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Created }, 400: { description: Invalid payload }, 409: { description: Duplicate name, reference or serial number } }
 * /materials/{uuid}:
 *   get: { tags: [Materials], summary: Get a material and its files, security: [{ bearerAuth: [] }], responses: { 200: { description: Material detail }, 404: { description: Not found } } }
 *   put: { tags: [Materials], summary: Update all editable material fields, security: [{ bearerAuth: [] }], responses: { 200: { description: Updated }, 400: { description: Invalid dates or UUID relation }, 409: { description: Duplicate record } } }
 *   delete: { tags: [Materials], summary: Soft-delete a material, security: [{ bearerAuth: [] }], responses: { 204: { description: Deleted }, 403: { description: materials.delete is required }, 404: { description: Not found } } }
 * /materials/{uuid}/history:
 *   get: { tags: [Materials], summary: Get the material audit trail, security: [{ bearerAuth: [] }], responses: { 200: { description: Audit events } } }
 * /materials/{uuid}/photos:
 *   post:
 *     tags: [Material files]
 *     summary: Upload a photo. JPEG, PNG and WebP only; 10 MB per file and 10 photos per material.
 *     security: [{ bearerAuth: [] }]
 *     requestBody: { required: true, content: { multipart/form-data: { schema: { type: object, required: [file], properties: { file: { type: string, format: binary } } } } } }
 *     responses: { 201: { description: Uploaded }, 400: { description: Missing, invalid, oversized file or photo limit reached }, 401: { description: Authentication required }, 403: { description: materials.update is required }, 404: { description: Material not found } }
 * /materials/{uuid}/documents:
 *   post:
 *     tags: [Material files]
 *     summary: Upload a PDF document.
 *     security: [{ bearerAuth: [] }]
 *     requestBody: { required: true, content: { multipart/form-data: { schema: { type: object, required: [file, documentType], properties: { file: { type: string, format: binary }, documentType: { type: string, enum: [invoice, manual, certificate, other] } } } } } }
 *     responses: { 201: { description: Uploaded }, 400: { description: Invalid file or document type }, 401: { description: Authentication required }, 403: { description: materials.update is required } }
 * /materials/files/{fileUuid}/content:
 *   get: { tags: [Material files], summary: View a protected photo inline, security: [{ bearerAuth: [] }], responses: { 200: { description: Image stream }, 400: { description: Resource is not a photo }, 404: { description: File missing } } }
 * /materials/files/{fileUuid}/download:
 *   get: { tags: [Material files], summary: Download a protected document as attachment, security: [{ bearerAuth: [] }], responses: { 200: { description: File stream }, 404: { description: File missing } } }
 * /materials/files/{fileUuid}/primary:
 *   patch: { tags: [Material files], summary: Set a photo as the only primary photo, security: [{ bearerAuth: [] }], responses: { 200: { description: Updated }, 404: { description: Photo not found } } }
 * /materials/files/{fileUuid}:
 *   delete: { tags: [Material files], summary: Delete a protected material file, security: [{ bearerAuth: [] }], responses: { 204: { description: Deleted }, 404: { description: File not found } } }
 */
export const materialsOpenApi = true;

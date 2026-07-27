/** @openapi
 * /maintenance:
 *   get: { tags: [Maintenance], summary: List maintenance tasks with filters and pagination (5 by default, or limit=all)., security: [{ bearerAuth: [] }], responses: { 200: { description: Paginated tasks }, 403: { description: maintenance.read required } } }
 *   post: { tags: [Maintenance], summary: Assign a compatible maintenance template to a material and calculate its deadline, security: [{ bearerAuth: [] }], responses: { 201: { description: Created }, 400: { description: Incompatible template or invalid date } } }
 * /maintenance/{uuid}:
 *   get: { tags: [Maintenance], summary: Get a task, security: [{ bearerAuth: [] }], responses: { 200: { description: Task }, 404: { description: Missing task } } }
 *   put: { tags: [Maintenance], summary: Update a task and recalculate deadlines, security: [{ bearerAuth: [] }], responses: { 200: { description: Updated } } }
 * /maintenance/{uuid}/status:
 *   patch: { tags: [Maintenance], summary: Enable or disable a task, security: [{ bearerAuth: [] }], responses: { 200: { description: Updated } } }
 * /maintenance/{uuid}/execute:
 *   post: { tags: [Maintenance], summary: Record an executed maintenance operation, security: [{ bearerAuth: [] }], responses: { 200: { description: History created and deadlines recalculated } } }
 * /maintenance/{uuid}/history:
 *   get: { tags: [Maintenance], summary: List completed maintenance history, security: [{ bearerAuth: [] }], responses: { 200: { description: History } } }
 * /maintenance-templates:
 *   get: { tags: [Maintenance], summary: List model-specific maintenance templates, security: [{ bearerAuth: [] }], responses: { 200: { description: Templates } } }
 *   post: { tags: [Maintenance], summary: Create a template for an exact brand and material model, security: [{ bearerAuth: [] }], responses: { 201: { description: Created } } }
 * /maintenance-templates/{uuid}:
 *   put: { tags: [Maintenance], summary: Update a model-specific maintenance template, security: [{ bearerAuth: [] }], responses: { 200: { description: Updated } } }
 *   delete: { tags: [Maintenance], summary: Delete an unused maintenance template, security: [{ bearerAuth: [] }], responses: { 204: { description: Deleted }, 409: { description: Template is assigned } } }
 */
export const maintenanceOpenApi = true;

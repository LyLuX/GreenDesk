/** @openapi
 * /maintenance:
 *   get: { tags: [Maintenance], summary: List maintenance tasks with materialUuid, priority, maintenanceType, active, overdue and upcoming filters, security: [{ bearerAuth: [] }], responses: { 200: { description: Paginated tasks }, 403: { description: maintenance.read required } } }
 *   post: { tags: [Maintenance], summary: Create a preventive maintenance task and calculate deadlines, security: [{ bearerAuth: [] }], responses: { 201: { description: Created }, 400: { description: Invalid interval or date } } }
 * /maintenance/{uuid}:
 *   get: { tags: [Maintenance], summary: Get a task, security: [{ bearerAuth: [] }], responses: { 200: { description: Task }, 404: { description: Missing task } } }
 *   put: { tags: [Maintenance], summary: Update a task and recalculate deadlines, security: [{ bearerAuth: [] }], responses: { 200: { description: Updated } } }
 * /maintenance/{uuid}/status:
 *   patch: { tags: [Maintenance], summary: Enable or disable a task, security: [{ bearerAuth: [] }], responses: { 200: { description: Updated } } }
 * /maintenance/{uuid}/execute:
 *   post: { tags: [Maintenance], summary: Record an executed maintenance operation, security: [{ bearerAuth: [] }], responses: { 200: { description: History created and deadlines recalculated } } }
 * /maintenance/{uuid}/history:
 *   get: { tags: [Maintenance], summary: List completed maintenance history, security: [{ bearerAuth: [] }], responses: { 200: { description: History } } }
 */
export const maintenanceOpenApi = true;

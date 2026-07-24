/** @openapi
 * /dashboard/summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: Returns reference dashboard counts.
 *     description: Requires the `dashboard.read` permission.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Summary returned successfully.
 *         content:
 *           application/json:
 *             example: { success: true, data: { materials: { total: 12, active: 10, inactive: 2 }, categories: { total: 4 }, fleet: { totalPurchaseValue: 24500, averageCost: 2041.67, averageAge: 3.5 } } }
 *       401: { description: Authentication is required. }
 *       403: { description: dashboard.read permission is required. }
 *       500: { description: Unexpected server error. }
 */
export const dashboardOpenApi = true;

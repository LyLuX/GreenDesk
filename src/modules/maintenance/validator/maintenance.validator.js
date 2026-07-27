import { body, param, query } from 'express-validator';
const uuid = param('uuid').isUUID();
const listLimit = query('limit')
  .optional()
  .custom(
    (value) =>
      value === 'all' ||
      (Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 100),
  )
  .customSanitizer((value) => (value === 'all' ? value : Number(value)));
export const listValidator = [
  query('materialUuid').optional({ values: 'falsy' }).isUUID(),
  query('priority').optional({ values: 'falsy' }).isIn(['low', 'normal', 'high', 'critical']),
  query('maintenanceType')
    .optional({ values: 'falsy' })
    .isIn(['preventive', 'inspection', 'replacement', 'lubrication', 'cleaning', 'custom']),
  query('status')
    .optional({ values: 'falsy' })
    .isIn(['upToDate', 'upcoming', 'dueToday', 'overdue']),
  query('active').optional({ values: 'falsy' }).isBoolean().toBoolean(),
  query('overdue').optional({ values: 'falsy' }).isBoolean().toBoolean(),
  query('upcoming').optional({ values: 'falsy' }).isBoolean().toBoolean(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  listLimit,
];
export const createValidator = [
  body('materialUuid').isUUID(),
  body('templateUuid').isUUID(),
  body('lastMaintenanceDate').isISO8601(),
  body('notes').optional({ nullable: true }).trim(),
];
export const updateValidator = [
  uuid,
  body('materialUuid').optional().isUUID(),
  body('templateUuid').optional().isUUID(),
  body('lastMaintenanceDate').optional({ nullable: true }).isISO8601(),
  body('notes').optional({ nullable: true }).trim(),
];
export const uuidValidator = [uuid];
export const statusValidator = [uuid, body('active').isBoolean().toBoolean()];
export const executeValidator = [
  uuid,
  body('performedAt').optional().isISO8601(),
  body('comment').optional().trim(),
];

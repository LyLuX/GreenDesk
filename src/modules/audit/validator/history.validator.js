import { param, query } from 'express-validator';

import { paginationValidator } from '../../../core/validators/pagination.validator.js';
import {
  HISTORY_SECTION_VALUES,
  HISTORY_TYPES,
  HISTORY_TYPE_VALUES,
} from '../history.constants.js';

const dateQuery = (name) =>
  query(name)
    .optional({ values: 'falsy' })
    .isISO8601({ strict: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/);

export const historyListValidator = [
  param('section').isIn(HISTORY_SECTION_VALUES),
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  query('type')
    .optional({ values: 'falsy' })
    .isIn(HISTORY_TYPE_VALUES)
    .custom((value, { req }) => HISTORY_TYPES[req.params.section]?.includes(value)),
  query('action').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  query('userUuid').optional({ values: 'falsy' }).isUUID(),
  dateQuery('from'),
  dateQuery('through').custom((through, { req }) => {
    if (!through || !req.query.from || through >= req.query.from) return true;
    throw new Error('La date de fin doit être postérieure ou égale à la date de début.');
  }),
  ...paginationValidator,
];

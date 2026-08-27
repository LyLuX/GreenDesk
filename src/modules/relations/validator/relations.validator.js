import { query } from 'express-validator';

import { RELATION_MODES, RELATION_SCOPES } from '../relations.constants.js';

export const relationGraphValidator = [
  query('mode').optional().isIn(RELATION_MODES),
  query('scope').optional().isIn(RELATION_SCOPES),
];

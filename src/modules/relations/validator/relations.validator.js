import { isScalarInput } from '../../../core/validators/scalar-input.js';
import { query } from 'express-validator';

import { RELATION_MODES, RELATION_SCOPES } from '../relations.constants.js';

export const relationGraphValidator = [
  query('mode').optional().custom(isScalarInput).bail().isIn(RELATION_MODES),
  query('scope').optional().custom(isScalarInput).bail().isIn(RELATION_SCOPES),
];

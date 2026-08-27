import { query } from 'express-validator';

import { RELATION_MODES } from '../relations.constants.js';

export const relationGraphValidator = [query('mode').optional().isIn(RELATION_MODES)];

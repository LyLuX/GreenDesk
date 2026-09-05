import { query } from 'express-validator';

/** An omitted status uses the repository default; "all" explicitly disables the filter. */
export const activeFilterValidator = () =>
  query('active')
    .optional({ values: 'falsy' })
    .isIn(['true', 'false', '1', '0', 'all'])
    .withMessage('Le statut doit être true, false ou all.')
    .customSanitizer((value) =>
      value === 'all' ? value : value === true || value === 'true' || value === '1',
    );

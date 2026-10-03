import { isScalarInput } from '../../../core/validators/scalar-input.js';
import { MAX_UNIT_PRICE } from '../../../core/utils/money.js';
import { body, param, query } from 'express-validator';
import { activeFilterValidator } from '../../../core/validators/active-filter.validator.js';
import { paginationValidator } from '../../../core/validators/pagination.validator.js';
const uuid = param('uuid').custom(isScalarInput).bail().isUUID();
export const listValidator = [
  query('search').optional({ values: 'falsy' }).isString().bail().trim().isLength({ max: 150 }),
  ...paginationValidator,
  activeFilterValidator(),
  query('manufacturerUuid').optional({ values: 'falsy' }).custom(isScalarInput).bail().isUUID(),
  query('brandUuid').optional({ values: 'falsy' }).custom(isScalarInput).bail().isUUID(),
  query('categoryUuid').optional({ values: 'falsy' }).custom(isScalarInput).bail().isUUID(),
  query('sort')
    .optional()
    .custom(isScalarInput)
    .bail()
    .isIn(['name', 'purchasePrice', 'purchaseDate']),
  query('direction').optional().custom(isScalarInput).bail().isIn(['ASC', 'DESC']),
];
export const uuidValidator = [uuid];
export const historyValidator = [uuid, ...paginationValidator];
export const optionsValidator = [
  query('search').optional({ values: 'falsy' }).isString().bail().trim().isLength({ max: 150 }),
  activeFilterValidator(),
  ...paginationValidator,
];
export const createValidator = [
  body('name')
    .isString()
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Le nom du matériel est obligatoire.')
    .isLength({ max: 150 })
    .withMessage('Le nom du matériel ne peut pas dépasser 150 caractères.'),
  body('unit')
    .isString()
    .bail()
    .trim()
    .notEmpty()
    .withMessage('L’unité est obligatoire.')
    .isLength({ max: 50 })
    .withMessage('L’unité ne peut pas dépasser 50 caractères.'),
  body('purchasePrice')
    .custom(isScalarInput)
    .bail()
    .isFloat({ min: 0, max: MAX_UNIT_PRICE })
    .withMessage('Le prix d’achat doit être un nombre positif ou nul.')
    .toFloat(),
  body('manufacturerUuid')
    .optional({ nullable: true })
    .custom(isScalarInput)
    .bail()
    .isUUID()
    .withMessage('Le fabricant sélectionné est invalide.'),
  body('brandUuid').optional({ nullable: true }).custom(isScalarInput).bail().isUUID(),
  body('categoryUuid')
    .optional({ nullable: true })
    .custom(isScalarInput)
    .bail()
    .isUUID()
    .withMessage('La catégorie sélectionnée est invalide.'),
  body('model')
    .optional({ nullable: true })
    .isString()
    .bail()
    .trim()
    .isLength({ max: 150 })
    .withMessage('Le modèle ne peut pas dépasser 150 caractères.'),
  body('serialNumber')
    .optional({ nullable: true })
    .isString()
    .bail()
    .trim()
    .isLength({ max: 150 })
    .withMessage('Le numéro de série ne peut pas dépasser 150 caractères.'),
  body('purchaseDate')
    .optional({ nullable: true })
    .custom(isScalarInput)
    .bail()
    .isISO8601()
    .withMessage('La date d’achat est invalide.'),
  body('commissionedAt')
    .optional({ nullable: true })
    .custom(isScalarInput)
    .bail()
    .isISO8601()
    .withMessage('La date de mise en service est invalide.'),
  body('retiredAt')
    .optional({ nullable: true })
    .custom(isScalarInput)
    .bail()
    .isISO8601()
    .withMessage('La date de sortie de service est invalide.'),
  body('notes').optional({ nullable: true }).isString().bail().trim().isLength({ max: 10000 }),
];
export const updateValidator = [
  uuid,
  body('name')
    .optional()
    .isString()
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Le nom du matériel ne peut pas être vide.')
    .isLength({ max: 150 })
    .withMessage('Le nom du matériel ne peut pas dépasser 150 caractères.'),
  body('unit')
    .optional()
    .isString()
    .bail()
    .trim()
    .notEmpty()
    .withMessage('L’unité ne peut pas être vide.')
    .isLength({ max: 50 })
    .withMessage('L’unité ne peut pas dépasser 50 caractères.'),
  body('purchasePrice')
    .optional()
    .custom(isScalarInput)
    .bail()
    .isFloat({ min: 0, max: MAX_UNIT_PRICE })
    .withMessage('Le prix d’achat doit être un nombre positif ou nul.')
    .toFloat(),
  body('manufacturerUuid')
    .optional({ nullable: true })
    .custom(isScalarInput)
    .bail()
    .isUUID()
    .withMessage('Le fabricant sélectionné est invalide.'),
  body('brandUuid').optional({ nullable: true }).custom(isScalarInput).bail().isUUID(),
  body('categoryUuid')
    .optional({ nullable: true })
    .custom(isScalarInput)
    .bail()
    .isUUID()
    .withMessage('La catégorie sélectionnée est invalide.'),
  body('model')
    .optional({ nullable: true })
    .isString()
    .bail()
    .trim()
    .isLength({ max: 150 })
    .withMessage('Le modèle ne peut pas dépasser 150 caractères.'),
  body('serialNumber')
    .optional({ nullable: true })
    .isString()
    .bail()
    .trim()
    .isLength({ max: 150 })
    .withMessage('Le numéro de série ne peut pas dépasser 150 caractères.'),
  body('purchaseDate')
    .optional({ nullable: true })
    .custom(isScalarInput)
    .bail()
    .isISO8601()
    .withMessage('La date d’achat est invalide.'),
  body('commissionedAt')
    .optional({ nullable: true })
    .custom(isScalarInput)
    .bail()
    .isISO8601()
    .withMessage('La date de mise en service est invalide.'),
  body('retiredAt')
    .optional({ nullable: true })
    .custom(isScalarInput)
    .bail()
    .isISO8601()
    .withMessage('La date de sortie de service est invalide.'),
  body('notes').optional({ nullable: true }).isString().bail().trim().isLength({ max: 10000 }),
  body('active').optional().custom(isScalarInput).bail().isBoolean().toBoolean(),
];

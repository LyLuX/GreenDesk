import { body, param, query } from 'express-validator';
const uuid = param('uuid').isUUID();
export const listValidator = [
  query('search').optional().trim().isLength({ max: 150 }),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('active').optional().isBoolean().toBoolean(),
  query('brandUuid').optional().isUUID(),
  query('categoryUuid').optional().isUUID(),
  query('sort').optional().isIn(['name', 'purchasePrice', 'purchaseDate', 'engineHours']),
  query('direction').optional().isIn(['ASC', 'DESC']),
];
export const uuidValidator = [uuid];
export const createValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Le nom du matériel est obligatoire.')
    .isLength({ max: 150 })
    .withMessage('Le nom du matériel ne peut pas dépasser 150 caractères.'),
  body('unit')
    .trim()
    .notEmpty()
    .withMessage('L’unité est obligatoire.')
    .isLength({ max: 50 })
    .withMessage('L’unité ne peut pas dépasser 50 caractères.'),
  body('purchasePrice')
    .isFloat({ min: 0 })
    .withMessage('Le prix d’achat doit être un nombre positif ou nul.')
    .toFloat(),
  body('brandUuid')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('La marque sélectionnée est invalide.'),
  body('categoryUuid')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('La catégorie sélectionnée est invalide.'),
  body('model')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 })
    .withMessage('Le modèle ne peut pas dépasser 150 caractères.'),
  body('serialNumber')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 })
    .withMessage('Le numéro de série ne peut pas dépasser 150 caractères.'),
  body('engineHours')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Le nombre d’heures moteur doit être positif ou nul.')
    .toFloat(),
  body('purchaseDate')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('La date d’achat est invalide.'),
  body('commissionedAt')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('La date de mise en service est invalide.'),
  body('retiredAt')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('La date de sortie de service est invalide.'),
  body('notes').optional({ nullable: true }).trim(),
];
export const updateValidator = [
  uuid,
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Le nom du matériel ne peut pas être vide.')
    .isLength({ max: 150 })
    .withMessage('Le nom du matériel ne peut pas dépasser 150 caractères.'),
  body('unit')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('L’unité ne peut pas être vide.')
    .isLength({ max: 50 })
    .withMessage('L’unité ne peut pas dépasser 50 caractères.'),
  body('purchasePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Le prix d’achat doit être un nombre positif ou nul.')
    .toFloat(),
  body('brandUuid')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('La marque sélectionnée est invalide.'),
  body('categoryUuid')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('La catégorie sélectionnée est invalide.'),
  body('model')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 })
    .withMessage('Le modèle ne peut pas dépasser 150 caractères.'),
  body('serialNumber')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 })
    .withMessage('Le numéro de série ne peut pas dépasser 150 caractères.'),
  body('engineHours')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Le nombre d’heures moteur doit être positif ou nul.')
    .toFloat(),
  body('purchaseDate')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('La date d’achat est invalide.'),
  body('commissionedAt')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('La date de mise en service est invalide.'),
  body('retiredAt')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('La date de sortie de service est invalide.'),
  body('notes').optional({ nullable: true }).trim(),
];

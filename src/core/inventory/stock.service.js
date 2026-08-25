import HTTP_STATUS from '../constants/http-status.js';
import AppError from '../errors/app-error.js';
import StockMovementRepository from './stock-movement.repository.js';
import { MAX_STOCK_QUANTITY, STOCK_OPERATIONS } from './stock-operation.js';
import { addStockQuantities, isValidStockQuantity, roundStockQuantity } from './stock-quantity.js';

const decimalQuantity = (value, label, { allowZero = false } = {}) => {
  const quantity = Number(value);
  if (!isValidStockQuantity(quantity, { allowZero, maximum: MAX_STOCK_QUANTITY })) {
    throw new AppError(`${label} est invalide.`, HTTP_STATUS.BAD_REQUEST);
  }
  return roundStockQuantity(quantity);
};

/** Applies atomic stock operations to any entity exposing the shared quantity fields. */
export default class StockService {
  constructor(movementRepository = new StockMovementRepository()) {
    this.movementRepository = movementRepository;
  }

  async apply(
    item,
    {
      stockableType,
      operation,
      quantity,
      quantityOnHand,
      quantityOnOrder,
      performedAt,
      userId,
      source,
    },
    { transaction } = {},
  ) {
    const currentOnHand = decimalQuantity(item.quantityOnHand ?? 0, 'La quantité en stock', {
      allowZero: true,
    });
    const currentOnOrder = decimalQuantity(item.quantityOnOrder ?? 0, 'La quantité commandée', {
      allowZero: true,
    });
    let nextOnHand = currentOnHand;
    let nextOnOrder = currentOnOrder;

    if (operation === STOCK_OPERATIONS.ADJUST) {
      if (quantityOnHand === undefined && quantityOnOrder === undefined) {
        throw new AppError('Une quantité à ajuster doit être renseignée.', HTTP_STATUS.BAD_REQUEST);
      }
      if (quantityOnHand !== undefined) {
        nextOnHand = decimalQuantity(quantityOnHand, 'La quantité en stock', { allowZero: true });
      }
      if (quantityOnOrder !== undefined) {
        nextOnOrder = decimalQuantity(quantityOnOrder, 'La quantité commandée', {
          allowZero: true,
        });
      }
    } else {
      const amount = decimalQuantity(quantity, 'La quantité');
      if (operation === STOCK_OPERATIONS.ORDER) {
        nextOnOrder = addStockQuantities(nextOnOrder, amount);
      } else if (operation === STOCK_OPERATIONS.RECEIVE) {
        if (amount > currentOnOrder) {
          throw new AppError(
            'La quantité reçue dépasse la quantité actuellement commandée.',
            HTTP_STATUS.CONFLICT,
          );
        }
        nextOnOrder = addStockQuantities(nextOnOrder, -amount);
        nextOnHand = addStockQuantities(nextOnHand, amount);
      } else if (operation === STOCK_OPERATIONS.CONSUME) {
        if (amount > currentOnHand) {
          throw new AppError(
            `Stock insuffisant pour ${item.name ?? 'cette pièce'} : ${amount} requis, ${currentOnHand} disponible.`,
            HTTP_STATUS.CONFLICT,
          );
        }
        nextOnHand = addStockQuantities(nextOnHand, -amount);
      } else {
        throw new AppError('Opération de stock inconnue.', HTTP_STATUS.BAD_REQUEST);
      }
    }

    if (nextOnHand > MAX_STOCK_QUANTITY || nextOnOrder > MAX_STOCK_QUANTITY) {
      throw new AppError('La quantité maximale de stock est dépassée.', HTTP_STATUS.BAD_REQUEST);
    }

    const quantityOnHandChange = addStockQuantities(nextOnHand, -currentOnHand);
    const quantityOnOrderChange = addStockQuantities(nextOnOrder, -currentOnOrder);
    if (!quantityOnHandChange && !quantityOnOrderChange) {
      throw new AppError('Cet ajustement ne modifie aucune quantité.', HTTP_STATUS.BAD_REQUEST);
    }

    await item.update(
      { quantityOnHand: nextOnHand, quantityOnOrder: nextOnOrder, updatedBy: userId },
      { transaction },
    );
    await this.movementRepository.create(
      {
        stockableType,
        stockableId: item.id,
        operation,
        quantityOnHandChange,
        quantityOnOrderChange,
        quantityOnHandAfter: nextOnHand,
        quantityOnOrderAfter: nextOnOrder,
        sourceType: source?.type ?? null,
        sourceUuid: source?.uuid ?? null,
        performedBy: userId ?? null,
        performedAt: performedAt ?? new Date().toISOString().slice(0, 10),
      },
      { transaction },
    );
    return item;
  }

  getMovements(stockableType, stockableId, pagination) {
    return this.movementRepository.findByStockable(stockableType, stockableId, pagination);
  }
}

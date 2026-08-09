import { Transaction } from 'sequelize';

import sequelize from '../../config/database.js';
import '../database/transaction-context.js';
import logger from '../logger/logger.js';

const SUCCESS_STATUS_LIMIT = 400;

class ResponseRollback extends Error {}

/**
 * Wraps an API request in one managed transaction.
 * The response body is held until Sequelize has committed or rolled back the transaction.
 */
export function createTransactionMiddleware(database = sequelize) {
  return function transactionMiddleware(request, response, next) {
    const originalEnd = response.end.bind(response);
    let endArguments;

    database
      .transaction(
        { isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED },
        () =>
          new Promise((resolve, reject) => {
            let settled = false;
            const settle = (callback) => {
              if (settled) return;
              settled = true;
              callback();
            };

            response.end = (...args) => {
              endArguments = args;
              settle(() =>
                response.statusCode < SUCCESS_STATUS_LIMIT
                  ? resolve()
                  : reject(new ResponseRollback()),
              );
              return response;
            };
            response.once('close', () => {
              if (!response.writableEnded) settle(() => reject(new ResponseRollback()));
            });

            next();
          }),
      )
      .then(() => {
        response.end = originalEnd;
        if (endArguments) originalEnd(...endArguments);
      })
      .catch((error) => {
        response.end = originalEnd;
        if (error instanceof ResponseRollback) {
          if (endArguments) originalEnd(...endArguments);
          return;
        }
        logger.error('Unable to complete request transaction', {
          requestId: request.id,
          stack: error.stack,
        });
        next(error);
      });
  };
}

export const transactionMiddleware = createTransactionMiddleware();

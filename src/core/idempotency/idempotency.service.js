import { createHash } from 'node:crypto';
import { UniqueConstraintError } from 'sequelize';

import HTTP_STATUS from '../constants/http-status.js';
import AppError from '../errors/app-error.js';
import IdempotencyRepository from './idempotency.repository.js';

const digest = (value) => createHash('sha256').update(value).digest('hex');
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
};
const serializeResponse = (value) => JSON.parse(JSON.stringify(value));
const isDuplicateKeyError = (error) =>
  error instanceof UniqueConstraintError || error?.name === 'SequelizeUniqueConstraintError';
class DuplicateIdempotencyKeyError extends Error {}

/** Executes one critical write once and replays its committed HTTP response on retries. */
export default class IdempotencyService {
  constructor(repository = new IdempotencyRepository()) {
    this.repository = repository;
  }

  async execute({ key, userId, operation, request, statusCode }, handler) {
    const keyHash = digest(key);
    const requestHash = digest(JSON.stringify(canonicalize({ operation, request })));

    try {
      return await this.repository.withTransaction(async (transaction) => {
        let record;
        try {
          record = await this.repository.create(
            { userId, operation, keyHash, requestHash },
            { transaction },
          );
        } catch (error) {
          if (isDuplicateKeyError(error)) throw new DuplicateIdempotencyKeyError();
          throw error;
        }
        const body = serializeResponse(await handler());
        await this.repository.complete(
          record,
          { responseStatus: statusCode, responseBody: body },
          { transaction },
        );
        return { statusCode, body, replayed: false };
      });
    } catch (error) {
      if (!(error instanceof DuplicateIdempotencyKeyError)) throw error;
    }

    const completed = await this.repository.findByUserAndKeyHash(userId, keyHash);
    if (!completed || completed.responseStatus === null || completed.responseBody === null) {
      throw new AppError(
        'Une opération utilisant cette clé est déjà en cours. Réessayez avec la même clé.',
        HTTP_STATUS.CONFLICT,
      );
    }
    if (completed.requestHash !== requestHash) {
      throw new AppError(
        'Cette clé d’idempotence a déjà été utilisée pour une autre requête.',
        HTTP_STATUS.CONFLICT,
      );
    }
    return {
      statusCode: Number(completed.responseStatus),
      body: completed.responseBody,
      replayed: true,
    };
  }
}

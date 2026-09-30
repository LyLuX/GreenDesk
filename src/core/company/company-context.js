import { AsyncLocalStorage } from 'node:async_hooks';

import HTTP_STATUS from '../constants/http-status.js';
import AppError from '../errors/app-error.js';

const companyStorage = new AsyncLocalStorage();

export const runWithCompanyScope = (scope, callback) =>
  companyStorage.run(scope == null ? null : Object.freeze({ ...scope }), callback);

export const getCompanyScope = () => companyStorage.getStore() ?? null;

export const requireCompanyScope = () => {
  const scope = getCompanyScope();
  if (!Number.isSafeInteger(scope?.companyId) || scope.companyId <= 0) {
    throw new AppError('Un contexte de société est requis.', HTTP_STATUS.FORBIDDEN);
  }
  return scope;
};

export const companyWhere = (where = {}) => {
  const { companyId } = requireCompanyScope();
  return { ...where, companyId };
};

export const companyValues = (values = {}) => {
  const { companyId } = requireCompanyScope();
  return { ...values, companyId };
};

/** Checks provenance before mutating a previously loaded company-owned instance. */
export const requireCompanyInstance = (instance) => {
  const { companyId } = requireCompanyScope();
  const matches = (value) =>
    (typeof value === 'number' || (typeof value === 'string' && /^[1-9]\d*$/.test(value))) &&
    Number(value) === companyId;
  const previousCompanyId = instance?.previous?.('companyId');
  if (
    !matches(instance?.companyId) ||
    (previousCompanyId !== undefined && !matches(previousCompanyId))
  ) {
    throw new AppError('Accès à cette société interdit.', HTTP_STATUS.FORBIDDEN);
  }
  return instance;
};

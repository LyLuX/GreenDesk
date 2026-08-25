import { AsyncLocalStorage } from 'node:async_hooks';

import HTTP_STATUS from '../constants/http-status.js';
import AppError from '../errors/app-error.js';

const companyStorage = new AsyncLocalStorage();

export const runWithCompanyScope = (scope, callback) => companyStorage.run(scope, callback);

export const getCompanyScope = () => companyStorage.getStore() ?? null;

export const requireCompanyScope = () => {
  const scope = getCompanyScope();
  if (!scope?.companyId) {
    throw new AppError('Un contexte de société est requis.', HTTP_STATUS.FORBIDDEN);
  }
  return scope;
};

export const companyWhere = (where = {}) => {
  const scope = getCompanyScope();
  return scope?.companyId ? { ...where, companyId: scope.companyId } : where;
};

export const companyValues = (values = {}) => {
  const scope = getCompanyScope();
  return scope?.companyId ? { ...values, companyId: scope.companyId } : values;
};

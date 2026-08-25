import HTTP_STATUS from '../constants/http-status.js';
import AppError from '../errors/app-error.js';
import { runWithCompanyScope } from '../company/company-context.js';
import companyPermissions from '../../modules/companies/company.permissions.js';
import CompanyRepository from '../../modules/companies/repository/company.repository.js';

const headerName = 'x-company-uuid';

/** Resolves the concrete company selected for a company-scoped API request. */
export const createResolveCompanyContext =
  (companyRepository = new CompanyRepository()) =>
  async (request, _response, next) => {
    const access = Array.isArray(request.user?.companyAccess) ? request.user.companyAccess : [];
    const accessAll = request.user?.permissions?.includes(companyPermissions.accessAll) === true;
    const requestedUuid = request.headers[headerName];
    const assignedCompany = requestedUuid
      ? access.find(({ uuid }) => uuid === requestedUuid)
      : access[0];
    let company;

    if (assignedCompany) {
      company = await companyRepository.findByUuid(assignedCompany.uuid);
    } else if (requestedUuid && accessAll) {
      company = await companyRepository.findByUuid(requestedUuid);
    }
    if (company && company.active === false) company = null;
    if (requestedUuid && !company) {
      return next(new AppError('Accès à cette société interdit.', HTTP_STATUS.FORBIDDEN));
    }
    if (!company && accessAll) company = await companyRepository.findFirstActive();
    if (!company) {
      return next(new AppError('Aucune société accessible.', HTTP_STATUS.FORBIDDEN));
    }

    return runWithCompanyScope(
      {
        companyId: Number(company.id),
        companyUuid: company.uuid,
        accessAll,
      },
      next,
    );
  };

export const resolveCompanyContext = createResolveCompanyContext();

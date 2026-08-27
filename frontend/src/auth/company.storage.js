export const ACTIVE_COMPANY_STORAGE_KEY = 'greendesk.active-company-uuid';

export const readActiveCompanyUuid = () => localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);

export const saveActiveCompanyUuid = (uuid) => {
  if (uuid) localStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, uuid);
  else localStorage.removeItem(ACTIVE_COMPANY_STORAGE_KEY);
};

const companyNameCollator = new Intl.Collator('fr', { sensitivity: 'base' });

const findFirstCompanyAlphabetically = (companies) =>
  companies.reduce(
    (first, company) =>
      !first || companyNameCollator.compare(company.name, first.name) < 0 ? company : first,
    null,
  );

/** Keeps the selected company valid for the companies present in a session. */
export const resolveActiveCompany = (companies = [], { preserveSelection = true } = {}) => {
  const storedUuid = preserveSelection ? readActiveCompanyUuid() : null;
  const company =
    companies.find(({ uuid }) => uuid === storedUuid) ?? findFirstCompanyAlphabetically(companies);
  saveActiveCompanyUuid(company?.uuid);
  return company;
};

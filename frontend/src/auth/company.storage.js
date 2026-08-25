export const ACTIVE_COMPANY_STORAGE_KEY = 'greendesk.active-company-uuid';

export const readActiveCompanyUuid = () => localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);

export const saveActiveCompanyUuid = (uuid) => {
  if (uuid) localStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, uuid);
  else localStorage.removeItem(ACTIVE_COMPANY_STORAGE_KEY);
};

/** Keeps the selected company valid for the companies present in a session. */
export const resolveActiveCompany = (companies = []) => {
  const storedUuid = readActiveCompanyUuid();
  const company = companies.find(({ uuid }) => uuid === storedUuid) ?? companies[0] ?? null;
  saveActiveCompanyUuid(company?.uuid);
  return company;
};

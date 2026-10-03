export { writeValues as userWriteValues } from '../../core/validators/write-values.js';

export const REGISTRATION_FIELDS = ['firstName', 'lastName', 'email', 'password'];
export const USER_CREATE_FIELDS = [...REGISTRATION_FIELDS, 'roleUuids', 'companyUuids'];
export const USER_UPDATE_FIELDS = [...USER_CREATE_FIELDS, 'isActive'];

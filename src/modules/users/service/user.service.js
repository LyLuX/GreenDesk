import bcrypt from 'bcrypt';

import HTTP_STATUS from '../../../core/constants/http-status.js';
import administrationPermissions from '../../../core/constants/administration-permissions.js';
import { getCompanyScope } from '../../../core/company/company-context.js';
import { readableRoleNames } from '../../../core/constants/user-visibility-permissions.js';
import AppError from '../../../core/errors/app-error.js';
import AuditService from '../../audit/service/audit.service.js';
import RoleRepository from '../../roles/repository/role.repository.js';
import companyPermissions from '../../companies/company.permissions.js';
import CompanyRepository from '../../companies/repository/company.repository.js';
import UserRepository from '../repository/user.repository.js';
import { normalizePagination, paginatedResult } from '../../../core/utils/pagination.js';

const PASSWORD_ROUNDS = 12;
const sameUuids = (left = [], right = []) => {
  const leftUuids = left.map(({ uuid }) => uuid).sort();
  const rightUuids = right.map(({ uuid }) => uuid).sort();
  return (
    leftUuids.length === rightUuids.length &&
    leftUuids.every((uuid, index) => uuid === rightUuids[index])
  );
};
const rolesGrantGlobalCompanyAccess = (roles = []) =>
  roles.some((role) =>
    role.permissions?.some((permission) => permission.name === companyPermissions.accessAll),
  );

/** Business operations for GreenDesk users. */
export default class UserService {
  constructor(
    userRepository = new UserRepository(),
    roleRepository = new RoleRepository(),
    auditService = new AuditService(),
    companyRepository = new CompanyRepository(),
  ) {
    this.userRepository = userRepository;
    this.roleRepository = roleRepository;
    this.companyRepository = companyRepository;
    this.auditService = auditService;
  }

  visibleRoleNames(permissionNames = []) {
    return permissionNames.includes(administrationPermissions.users.all.read)
      ? undefined
      : readableRoleNames(permissionNames);
  }

  async getAll(query = {}, visibilityPermissions = []) {
    const companyScope = getCompanyScope();
    const result = await this.userRepository.findAll({
      ...query,
      visibleRoleNames: this.visibleRoleNames(visibilityPermissions),
      ...(!visibilityPermissions.includes(companyPermissions.accessAll) && companyScope
        ? { companyId: companyScope.companyId }
        : {}),
    });
    return paginatedResult(result, normalizePagination(query));
  }

  async getByUuid(uuid, { visibilityPermissions, ...options } = {}) {
    const companyScope = getCompanyScope();
    const user = await this.userRepository.findByUuid(uuid, {
      ...options,
      ...(visibilityPermissions
        ? { visibleRoleNames: this.visibleRoleNames(visibilityPermissions) }
        : {}),
      ...(visibilityPermissions &&
      !visibilityPermissions.includes(companyPermissions.accessAll) &&
      companyScope
        ? { companyId: companyScope.companyId }
        : {}),
    });
    if (!user) throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    return user;
  }

  async create(
    values,
    actorUserId = null,
    defaultRoleName = null,
    { requireEmailVerification = false, actorClaims = null } = {},
  ) {
    const email = values.email.toLowerCase();
    const { roleUuids, companyUuids, ...userValues } = values;
    const emailVerifiedAt = requireEmailVerification ? null : new Date();
    const assignedRoles = roleUuids?.length ? await this.findRoles(roleUuids) : null;
    const assignedCompanies = await this.resolveCompanies(companyUuids, actorClaims);
    if (!assignedCompanies.length && !rolesGrantGlobalCompanyAccess(assignedRoles)) {
      throw new AppError(
        'Un utilisateur sans accès global doit appartenir à au moins une société.',
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    const passwordHash = await bcrypt.hash(values.password, PASSWORD_ROUNDS);
    return this.userRepository.withTransaction(async (transaction) => {
      const existingUser = await this.userRepository.findByEmail(email, {
        withDeleted: true,
        transaction,
      });
      if (existingUser && !existingUser.deletedAt)
        throw new AppError('Email is already in use', HTTP_STATUS.CONFLICT);
      const oldValues = existingUser ? this.publicUser(existingUser) : null;
      if (existingUser) {
        if (!actorClaims?.permissions?.includes(administrationPermissions.users.deleted.update)) {
          throw new AppError('Insufficient permissions', HTTP_STATUS.FORBIDDEN);
        }
        await this.userRepository.restore(existingUser, { transaction });
        await this.userRepository.update(
          existingUser,
          {
            ...userValues,
            email,
            passwordHash,
            isActive: true,
            emailVerifiedAt,
            lastLoginAt: null,
          },
          { transaction },
        );
      }
      const user =
        existingUser ??
        (await this.userRepository.create(
          { ...userValues, email, passwordHash, emailVerifiedAt },
          { transaction },
        ));
      if (assignedRoles) {
        await this.userRepository.setRoles(user, assignedRoles, { transaction });
      } else if (defaultRoleName) {
        const role = await this.roleRepository.findByName(defaultRoleName, { transaction });
        if (!role)
          throw new AppError(
            `Default role ${defaultRoleName} is not configured`,
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
          );
        await this.userRepository.setRoles(user, [role], { transaction });
      }
      await this.userRepository.setCompanies(user, assignedCompanies, { transaction });
      if (existingUser) {
        await this.userRepository.incrementAuthorizationVersion(existingUser.id, { transaction });
      }
      await this.auditService.record(
        {
          userId: actorUserId,
          companyId: assignedCompanies[0]?.id,
          action: existingUser ? 'USER_RESTORED' : 'USER_CREATED',
          entity: 'USER',
          entityUuid: user.uuid,
          ...(oldValues ? { oldValues } : {}),
          newValues: this.publicUser(user),
        },
        { transaction },
      );
      return this.getByUuid(user.uuid, { transaction });
    });
  }

  async update(uuid, values, actorUserId = null, actorClaims = null) {
    const user = await this.getByUuid(uuid, {
      visibilityPermissions: actorClaims?.permissions,
    });
    const oldValues = this.publicUser(user);
    const { roleUuids, companyUuids, ...updateValues } = values;
    const assignedRoles = roleUuids !== undefined ? await this.findRoles(roleUuids) : null;
    const assignedCompanies =
      companyUuids !== undefined ? await this.resolveCompanies(companyUuids, actorClaims) : null;
    const rolesChanged = assignedRoles !== null && !sameUuids(user.roles, assignedRoles);
    const companiesChanged =
      assignedCompanies !== null && !sameUuids(user.companies, assignedCompanies);
    if (
      assignedCompanies?.length === 0 &&
      !rolesGrantGlobalCompanyAccess(assignedRoles ?? user.roles)
    ) {
      throw new AppError(
        'Un utilisateur sans accès global doit appartenir à au moins une société.',
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    if (values.email && values.email.toLowerCase() !== user.email) {
      const existingUser = await this.userRepository.findByEmail(values.email.toLowerCase());
      if (existingUser && existingUser.uuid !== user.uuid) {
        throw new AppError('Email is already in use', HTTP_STATUS.CONFLICT);
      }
      updateValues.email = values.email.toLowerCase();
    }
    if (values.password)
      updateValues.passwordHash = await bcrypt.hash(values.password, PASSWORD_ROUNDS);
    delete updateValues.password;
    return this.userRepository.withTransaction(async (transaction) => {
      await this.userRepository.update(user, updateValues, { transaction });
      if (assignedRoles) await this.userRepository.setRoles(user, assignedRoles, { transaction });
      if (assignedCompanies) {
        await this.userRepository.setCompanies(user, assignedCompanies, { transaction });
      }
      if (
        companiesChanged ||
        (rolesChanged && (actorUserId === null || String(user.id) !== String(actorUserId)))
      ) {
        await this.userRepository.incrementAuthorizationVersion(user.id, { transaction });
      }
      await this.auditService.record(
        {
          userId: actorUserId,
          action: 'USER_UPDATED',
          entity: 'USER',
          entityUuid: user.uuid,
          oldValues,
          newValues: this.publicUser(user),
        },
        { transaction },
      );
      return this.getByUuid(uuid, { transaction });
    });
  }

  async remove(uuid, actorUserId = null, actorClaims = null) {
    await this.userRepository.withTransaction(async (transaction) => {
      const user = await this.getByUuid(uuid, {
        transaction,
        visibilityPermissions: actorClaims?.permissions,
      });
      await this.userRepository.incrementAuthorizationVersion(user.id, { transaction });
      await this.userRepository.delete(user, { transaction });
      await this.auditService.record(
        {
          userId: actorUserId,
          action: 'USER_DELETED',
          entity: 'USER',
          entityUuid: user.uuid,
          oldValues: this.publicUser(user),
        },
        { transaction },
      );
    });
  }

  async restore(uuid, actorUserId = null, actorClaims = null) {
    return this.userRepository.withTransaction(async (transaction) => {
      const companyScope = getCompanyScope();
      const user = await this.userRepository.findByUuid(uuid, {
        withDeleted: true,
        transaction,
        ...(!actorClaims?.permissions?.includes(companyPermissions.accessAll) && companyScope
          ? { companyId: companyScope.companyId }
          : {}),
      });
      if (!user) throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
      if (!user.deletedAt) {
        throw new AppError('User is not deleted', HTTP_STATUS.CONFLICT);
      }
      const oldValues = this.publicUser(user);
      await this.userRepository.restore(user, { transaction });
      await this.userRepository.incrementAuthorizationVersion(user.id, { transaction });
      await this.auditService.record(
        {
          userId: actorUserId,
          action: 'USER_RESTORED',
          entity: 'USER',
          entityUuid: user.uuid,
          oldValues,
          newValues: this.publicUser(user),
        },
        { transaction },
      );
      return user;
    });
  }

  /** Converts a Sequelize instance or plain user to a password-safe payload. */
  publicUser(user) {
    const value = typeof user.toJSON === 'function' ? user.toJSON() : user;
    const safeUser = { ...value };
    delete safeUser.passwordHash;
    delete safeUser.authorizationVersion;
    if (Array.isArray(safeUser.companies)) {
      safeUser.companies = safeUser.companies.map(
        ({
          id: _id,
          logoFileName,
          logoOriginalName: _originalName,
          logoMimeType: _mimeType,
          ...company
        }) => ({
          ...company,
          hasLogo: Boolean(logoFileName),
        }),
      );
    }
    return safeUser;
  }

  /** Resolves role UUIDs and rejects assignments that reference deleted roles. */
  async findRoles(roleUuids) {
    const roles = await Promise.all(
      roleUuids.map((roleUuid) => this.roleRepository.findByUuid(roleUuid)),
    );
    if (roles.some((role) => !role))
      throw new AppError('One or more roles were not found', HTTP_STATUS.BAD_REQUEST);
    return roles;
  }

  /** Resolves company assignments without allowing an actor to escape its own company boundary. */
  async resolveCompanies(companyUuids, actorClaims = null) {
    if (companyUuids === undefined) {
      const scope = getCompanyScope();
      const company = scope
        ? await this.companyRepository.findByUuid(scope.companyUuid)
        : await this.companyRepository.findFirstActive();
      if (!company) {
        throw new AppError('Aucune société active n’est configurée.', HTTP_STATUS.BAD_REQUEST);
      }
      return [company];
    }

    const uniqueUuids = [...new Set(companyUuids)];
    const hasGlobalAccess = actorClaims?.permissions?.includes(companyPermissions.accessAll);
    if (actorClaims && !hasGlobalAccess) {
      const accessibleUuids = new Set((actorClaims.companyAccess ?? []).map(({ uuid }) => uuid));
      if (uniqueUuids.some((uuid) => !accessibleUuids.has(uuid))) {
        throw new AppError('Accès à cette société interdit.', HTTP_STATUS.FORBIDDEN);
      }
    }
    const companies = await this.companyRepository.findByUuids(uniqueUuids);
    if (companies.length !== uniqueUuids.length) {
      throw new AppError('Une ou plusieurs sociétés sont introuvables.', HTTP_STATUS.BAD_REQUEST);
    }
    return companies;
  }
}

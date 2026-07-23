import bcrypt from 'bcrypt';

import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import AuditService from '../../audit/service/audit.service.js';
import RoleRepository from '../../roles/repository/role.repository.js';
import UserRepository from '../repository/user.repository.js';

const PASSWORD_ROUNDS = 12;

/** Business operations for GreenDesk users. */
export default class UserService {
  constructor(
    userRepository = new UserRepository(),
    roleRepository = new RoleRepository(),
    auditService = new AuditService(),
  ) {
    this.userRepository = userRepository;
    this.roleRepository = roleRepository;
    this.auditService = auditService;
  }

  async getAll() {
    return this.userRepository.findAll();
  }

  async getByUuid(uuid) {
    const user = await this.userRepository.findByUuid(uuid);
    if (!user) throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    return user;
  }

  async create(values, actorUserId = null, defaultRoleName = null) {
    const existingUser = await this.userRepository.findByEmail(values.email);
    if (existingUser) throw new AppError('Email is already in use', HTTP_STATUS.CONFLICT);

    const { roleUuids, ...userValues } = values;
    const assignedRoles = roleUuids?.length ? await this.findRoles(roleUuids) : null;
    const passwordHash = await bcrypt.hash(values.password, PASSWORD_ROUNDS);
    const user = await this.userRepository.create({
      ...userValues,
      email: values.email.toLowerCase(),
      passwordHash,
    });
    if (assignedRoles) {
      await this.userRepository.setRoles(user, assignedRoles);
    } else if (defaultRoleName) {
      const role = await this.roleRepository.findByName(defaultRoleName);
      if (!role)
        throw new AppError(
          `Default role ${defaultRoleName} is not configured`,
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
        );
      await this.userRepository.setRoles(user, [role]);
    }
    await this.auditService.record({
      userId: actorUserId,
      action: 'USER_CREATED',
      entity: 'USER',
      entityUuid: user.uuid,
      newValues: this.publicUser(user),
    });
    return this.getByUuid(user.uuid);
  }

  async update(uuid, values, actorUserId = null) {
    const user = await this.getByUuid(uuid);
    const oldValues = this.publicUser(user);
    const { roleUuids, ...updateValues } = values;
    const assignedRoles = roleUuids !== undefined ? await this.findRoles(roleUuids) : null;
    if (values.email && values.email.toLowerCase() !== user.email) {
      const existingUser = await this.userRepository.findByEmail(values.email.toLowerCase());
      if (existingUser) throw new AppError('Email is already in use', HTTP_STATUS.CONFLICT);
      updateValues.email = values.email.toLowerCase();
    }
    if (values.password)
      updateValues.passwordHash = await bcrypt.hash(values.password, PASSWORD_ROUNDS);
    delete updateValues.password;
    await this.userRepository.update(user, updateValues);
    if (assignedRoles) await this.userRepository.setRoles(user, assignedRoles);
    await this.auditService.record({
      userId: actorUserId,
      action: 'USER_UPDATED',
      entity: 'USER',
      entityUuid: user.uuid,
      oldValues,
      newValues: this.publicUser(user),
    });
    return this.getByUuid(uuid);
  }

  async remove(uuid, actorUserId = null) {
    const user = await this.getByUuid(uuid);
    await this.userRepository.delete(user);
    await this.auditService.record({
      userId: actorUserId,
      action: 'USER_DELETED',
      entity: 'USER',
      entityUuid: user.uuid,
      oldValues: this.publicUser(user),
    });
  }

  /** Converts a Sequelize instance or plain user to a password-safe payload. */
  publicUser(user) {
    const value = typeof user.toJSON === 'function' ? user.toJSON() : user;
    const safeUser = { ...value };
    delete safeUser.passwordHash;
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
}

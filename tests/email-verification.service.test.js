import { createHash } from 'node:crypto';
import { jest } from '@jest/globals';

import EmailVerificationService from '../src/modules/auth/service/email-verification.service.js';

const user = {
  id: 4,
  uuid: 'fbf62a85-827b-4c83-8b35-16b1d5081377',
  firstName: 'Marie',
  email: 'marie@example.test',
  emailVerifiedAt: null,
};
const transaction = { LOCK: { UPDATE: 'UPDATE' } };
const transactional = (repository) => ({
  ...repository,
  withTransaction: jest.fn((callback) => callback(transaction)),
});

describe('EmailVerificationService', () => {
  it('stores only the hash and sends the opaque token in the verification URL', async () => {
    const repository = transactional({
      findLatestForUser: jest.fn().mockResolvedValue(null),
      deleteExpired: jest.fn(),
      invalidateForUser: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 12 }),
      delete: jest.fn(),
    });
    const mailService = { send: jest.fn() };
    const service = new EmailVerificationService(
      repository,
      {},
      mailService,
      { record: jest.fn() },
      { ttlHours: 24, ttlMs: 86_400_000, cooldownMs: 60_000 },
      'https://greendesk.example.test',
      { error: jest.fn() },
    );

    const delivery = await service.issue(user);

    const storedHash = repository.create.mock.calls[0][0].tokenHash;
    const sentUrl = new URL(mailService.send.mock.calls[0][0].text.match(/https:\/\/\S+/)[0]);
    const rawToken = sentUrl.searchParams.get('token');
    expect(storedHash).toBe(createHash('sha256').update(rawToken).digest('hex'));
    expect(storedHash).not.toContain(rawToken);
    expect(delivery).toEqual({ sent: true, resendCooldownSeconds: 60 });
  });

  it('verifies a valid token exactly once and records the event', async () => {
    const tokenRecord = { userId: user.id };
    const repository = transactional({
      findValidByHash: jest.fn().mockResolvedValue(tokenRecord),
      invalidateForUser: jest.fn(),
    });
    const persistedUser = { ...user };
    const userRepository = {
      findById: jest.fn().mockResolvedValue(persistedUser),
      update: jest.fn(),
    };
    const auditService = { record: jest.fn() };
    const service = new EmailVerificationService(
      repository,
      userRepository,
      {},
      auditService,
      { ttlHours: 24, ttlMs: 86_400_000, cooldownMs: 60_000 },
      'https://greendesk.example.test',
      { error: jest.fn() },
    );

    await service.verify('a'.repeat(43));

    expect(userRepository.update).toHaveBeenCalledWith(
      persistedUser,
      { emailVerifiedAt: expect.any(Date) },
      { transaction },
    );
    expect(repository.invalidateForUser).toHaveBeenCalledWith(user.id, expect.any(Date), {
      transaction,
    });
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'USER_EMAIL_VERIFIED', entityUuid: user.uuid }),
      { transaction },
    );
  });

  it('returns the same resend response for an unknown address', async () => {
    const service = new EmailVerificationService(
      {},
      { findByEmail: jest.fn().mockResolvedValue(null) },
      {},
      {},
      { cooldownMs: 60_000 },
      'https://greendesk.example.test',
      { error: jest.fn() },
    );
    await expect(service.resend('unknown@example.test')).resolves.toEqual({
      message: 'Si un compte non vérifié correspond à cette adresse, un nouvel email a été envoyé.',
      resendCooldownSeconds: 60,
    });
  });

  it('prevents consecutive public and administrative resends during the cooldown', async () => {
    const repository = {
      findLatestForUser: jest.fn().mockResolvedValue({
        createdAt: new Date(Date.now() - 15_000),
      }),
    };
    const userRepository = {
      findByEmail: jest.fn().mockResolvedValue(user),
      findByUuid: jest.fn().mockResolvedValue(user),
    };
    const mailService = { send: jest.fn() };
    const service = new EmailVerificationService(
      repository,
      userRepository,
      mailService,
      { record: jest.fn() },
      { ttlHours: 24, ttlMs: 86_400_000, cooldownMs: 60_000 },
      'https://greendesk.example.test',
      { error: jest.fn() },
    );

    await expect(service.resend(user.email)).resolves.toEqual({
      message: 'Si un compte non vérifié correspond à cette adresse, un nouvel email a été envoyé.',
      resendCooldownSeconds: 60,
    });
    await expect(service.resendByUserUuid(user.uuid, 8)).rejects.toMatchObject({
      statusCode: 429,
      retryAfterSeconds: expect.any(Number),
    });
    expect(mailService.send).not.toHaveBeenCalled();
  });

  it('propagates a delivery failure when resending for a known account', async () => {
    const service = new EmailVerificationService(
      {},
      { findByEmail: jest.fn().mockResolvedValue(user) },
      {},
      {},
      {},
      'https://greendesk.example.test',
      { error: jest.fn() },
    );
    service.issue = jest.fn().mockRejectedValue({
      statusCode: 503,
      message: 'Email delivery failed',
    });

    await expect(service.resend(user.email)).rejects.toMatchObject({ statusCode: 503 });
  });
});

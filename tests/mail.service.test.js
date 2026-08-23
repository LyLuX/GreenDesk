import { jest } from '@jest/globals';

import MailService, { buildSmtpTransportOptions } from '../src/core/mail/mail.service.js';

const smtpConfiguration = (auth, overrides = {}) => ({
  host: 'smtp.example.test',
  port: 587,
  secure: false,
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  useSystemCa: false,
  auth,
  ...overrides,
});

describe('MailService', () => {
  it('builds password and OAuth2 transports from the same SMTP abstraction', () => {
    expect(
      buildSmtpTransportOptions(
        smtpConfiguration({ type: 'password', user: 'mailer', password: 'secret' }),
      ),
    ).toMatchObject({ auth: { user: 'mailer', pass: 'secret' } });
    expect(
      buildSmtpTransportOptions(
        smtpConfiguration({
          type: 'oauth2',
          user: 'mailer@example.test',
          clientId: 'client-id',
          clientSecret: 'client-secret',
          refreshToken: 'refresh-token',
          accessUrl: 'https://login.example.test/token',
          scope: 'smtp.send offline_access',
        }),
      ),
    ).toMatchObject({
      auth: {
        type: 'OAuth2',
        user: 'mailer@example.test',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        refreshToken: 'refresh-token',
        accessUrl: 'https://login.example.test/token',
        customParams: { scope: 'smtp.send offline_access' },
      },
    });
  });

  it('merges Node and operating-system certificate authorities when requested', () => {
    const getCACertificates = jest.fn((source) =>
      source === 'default' ? ['default-ca', 'shared-ca'] : ['system-ca', 'shared-ca'],
    );
    const options = buildSmtpTransportOptions(
      smtpConfiguration({ type: 'none' }, { useSystemCa: true }),
      getCACertificates,
    );

    expect(options.tls.ca).toEqual(['default-ca', 'shared-ca', 'system-ca']);
    expect(options).not.toHaveProperty('auth');
  });

  it('fails explicitly when the Node runtime cannot expose system certificates', () => {
    expect(() =>
      buildSmtpTransportOptions(smtpConfiguration({ type: 'none' }, { useSystemCa: true }), null),
    ).toThrow(/version de Node compatible/);
  });

  it('uses the shared sender configuration for arbitrary email workflows', async () => {
    const transport = { sendMail: jest.fn().mockResolvedValue({ messageId: 'message-1' }) };
    const service = new MailService(
      {
        enabled: true,
        from: { name: 'GreenDesk', address: 'no-reply@example.test' },
        smtp: {},
      },
      transport,
    );

    await service.send({
      to: 'recipient@example.test',
      subject: 'Subject',
      text: 'Text content',
      html: '<p>HTML content</p>',
    });

    expect(transport.sendMail).toHaveBeenCalledWith({
      from: { name: 'GreenDesk', address: 'no-reply@example.test' },
      to: 'recipient@example.test',
      subject: 'Subject',
      text: 'Text content',
      html: '<p>HTML content</p>',
    });
  });

  it('normalizes SMTP failures without exposing recipient details', async () => {
    const transport = {
      sendMail: jest.fn().mockRejectedValue({
        code: 'EENVELOPE',
        command: 'RCPT TO',
        responseCode: 550,
        message: 'Rejected recipient@example.test',
      }),
    };
    const serviceLogger = { error: jest.fn() };
    const service = new MailService(
      {
        enabled: true,
        from: { name: 'GreenDesk', address: 'no-reply@example.test' },
        smtp: {},
      },
      transport,
      serviceLogger,
    );

    await expect(
      service.send({ to: 'recipient@example.test', subject: 'Subject', text: 'Content' }),
    ).rejects.toMatchObject({ statusCode: 503, message: 'Email delivery failed' });
    expect(JSON.stringify(serviceLogger.error.mock.calls)).not.toContain('recipient@example.test');
  });
});

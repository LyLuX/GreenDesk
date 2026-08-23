import { jest } from '@jest/globals';

import MailService from '../src/core/mail/mail.service.js';

describe('MailService', () => {
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

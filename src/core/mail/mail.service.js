import nodemailer from 'nodemailer';
import tls from 'node:tls';

import env from '../../config/env.js';
import HTTP_STATUS from '../constants/http-status.js';
import AppError from '../errors/app-error.js';
import logger from '../logger/logger.js';

const oauth2Auth = (auth) => ({
  type: 'OAuth2',
  user: auth.user,
  ...(auth.clientId ? { clientId: auth.clientId } : {}),
  ...(auth.clientSecret ? { clientSecret: auth.clientSecret } : {}),
  ...(auth.refreshToken ? { refreshToken: auth.refreshToken } : {}),
  ...(auth.accessToken ? { accessToken: auth.accessToken } : {}),
  ...(auth.expiresAt ? { expires: auth.expiresAt } : {}),
  ...(auth.accessUrl ? { accessUrl: auth.accessUrl } : {}),
  ...(auth.scope ? { customParams: { scope: auth.scope } } : {}),
});

/** Builds transport options independently so providers and authentication modes remain testable. */
export const buildSmtpTransportOptions = (smtp, getCACertificates = tls.getCACertificates) => {
  if (smtp.useSystemCa && typeof getCACertificates !== 'function') {
    throw new Error('SMTP_USE_SYSTEM_CA nécessite une version de Node compatible.');
  }

  return {
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    pool: smtp.pool,
    maxConnections: smtp.maxConnections,
    maxMessages: smtp.maxMessages,
    ...(smtp.useSystemCa
      ? {
          tls: {
            ca: [...new Set([...getCACertificates('default'), ...getCACertificates('system')])],
          },
        }
      : {}),
    ...(smtp.auth.type === 'password'
      ? { auth: { user: smtp.auth.user, pass: smtp.auth.password } }
      : {}),
    ...(smtp.auth.type === 'oauth2' ? { auth: oauth2Auth(smtp.auth) } : {}),
  };
};

/** Shared mail gateway. One pooled SMTP transporter is reused by every email workflow. */
export default class MailService {
  constructor(configuration = env.mail, transport = null, serviceLogger = logger) {
    this.configuration = configuration;
    this.logger = serviceLogger;
    this.transport = transport ?? this.createTransport();
  }

  createTransport() {
    if (!this.configuration.enabled) return null;
    const { smtp } = this.configuration;
    return nodemailer.createTransport(buildSmtpTransportOptions(smtp));
  }

  async send({ to, subject, text, html, replyTo, headers }) {
    if (!this.transport) {
      throw new AppError('Email delivery is not configured', HTTP_STATUS.SERVICE_UNAVAILABLE);
    }
    try {
      return await this.transport.sendMail({
        from: this.configuration.from,
        to,
        subject,
        text,
        html,
        ...(replyTo ? { replyTo } : {}),
        ...(headers ? { headers } : {}),
      });
    } catch (error) {
      this.logger.error('Email delivery failed', {
        event: 'mail.delivery_failed',
        errorCode: error.code,
        smtpCommand: error.command,
        smtpResponseCode: error.responseCode,
      });
      throw new AppError('Email delivery failed', HTTP_STATUS.SERVICE_UNAVAILABLE);
    }
  }

  async verifyConnection() {
    if (!this.transport) return false;
    await this.transport.verify();
    return true;
  }
}

export const mailService = new MailService();

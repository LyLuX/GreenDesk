import client from './client.js';

export const verifyEmail = (token) => client.post('/v1/auth/verify-email', { token });
export const resendEmailVerification = (email) =>
  client.post('/v1/auth/verify-email/resend', { email });

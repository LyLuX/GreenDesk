const escapeHtml = (value = '') =>
  String(value).replace(
    /[&<>'"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character],
  );

/** Produces the text and HTML variants of the account-verification email. */
export const emailVerificationTemplate = ({ firstName, verificationUrl, expiresInHours }) => {
  const safeFirstName = escapeHtml(firstName);
  const safeUrl = escapeHtml(verificationUrl);
  const subject = 'Vérifiez votre adresse email GreenDesk';
  return {
    subject,
    text: [
      `Bonjour ${firstName},`,
      '',
      'Confirmez votre adresse email pour activer votre accès à GreenDesk :',
      verificationUrl,
      '',
      `Ce lien est valable ${expiresInHours} heure${expiresInHours > 1 ? 's' : ''}.`,
      "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
    ].join('\n'),
    html: `<!doctype html>
<html lang="fr">
  <body style="margin:0;background:#f5f7f5;color:#1d2a20;font-family:Arial,sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #d9e1da">
          <tr><td style="padding:28px">
            <h1 style="margin:0 0 20px;font-size:24px;color:#166534">GreenDesk</h1>
            <p>Bonjour ${safeFirstName},</p>
            <p>Confirmez votre adresse email pour activer votre accès à GreenDesk.</p>
            <p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;padding:12px 18px;background:#166534;color:#ffffff;text-decoration:none;font-weight:700">Vérifier mon adresse email</a></p>
            <p style="font-size:14px;color:#5d685f">Ce lien est valable ${expiresInHours} heure${expiresInHours > 1 ? 's' : ''}.</p>
            <p style="font-size:14px;color:#5d685f">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
  };
};

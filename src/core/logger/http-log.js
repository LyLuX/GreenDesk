/** Uses a registered route template, never caller-controlled URLs or query values. */
export function httpLogLine(tokens, request, response) {
  const route =
    typeof request.route?.path === 'string'
      ? `${request.baseUrl ?? ''}${request.route.path}`
      : 'unknown';
  return `${request.method} ${route} ${tokens.status(request, response)} ${tokens.res(request, response, 'content-length') ?? '-'} - ${tokens['response-time'](request, response)} ms`;
}

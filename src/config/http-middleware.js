/** Strict HTTP security headers adapted to GreenDesk's locally bundled frontend assets. */
export const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      baseUri: ["'self'"],
      connectSrc: ["'self'"],
      defaultSrc: ["'self'"],
      fontSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      frameSrc: ["'none'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      manifestSrc: ["'none'"],
      mediaSrc: ["'none'"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      workerSrc: ["'none'"],
    },
  },
  referrerPolicy: {
    policy: 'strict-origin',
  },
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none',
  },
  dnsPrefetchControl: {
    allow: false,
  },
  frameguard: {
    action: 'deny',
  },
};

/** Maximum zlib compression level and memory allocation for HTTP responses. */
export const compressionOptions = {
  level: 9,
  memLevel: 9,
};

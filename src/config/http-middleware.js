import { createHash } from 'node:crypto';

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
      styleSrc: ["'self'"],
      styleSrcElem: ["'self'"],
      styleSrcAttr: ["'none'"],
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

const sha256Source = (value) => `'sha256-${createHash('sha256').update(value).digest('base64')}'`;

/** Restricts Swagger UI inline CSS to the exact trusted styles it generates. */
export const createApiDocsHelmetOptions = (document) => {
  const elementHashes = [
    ...new Set(
      [...document.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((match) =>
        sha256Source(match[1]),
      ),
    ),
  ];
  const attributeHashes = [
    ...new Set(
      [...document.matchAll(/\sstyle=(?:"([^"]*)"|'([^']*)')/gi)].map((match) =>
        sha256Source(match[1] ?? match[2]),
      ),
    ),
  ];
  const styleSrc = ["'self'", ...elementHashes];
  if (attributeHashes.length) styleSrc.push("'unsafe-hashes'", ...attributeHashes);

  return {
    ...helmetOptions,
    contentSecurityPolicy: {
      ...helmetOptions.contentSecurityPolicy,
      directives: {
        ...helmetOptions.contentSecurityPolicy.directives,
        styleSrc,
        styleSrcElem: ["'self'", ...elementHashes],
        styleSrcAttr: attributeHashes.length ? ["'unsafe-hashes'", ...attributeHashes] : ["'none'"],
      },
    },
  };
};

/** Balanced zlib settings: near-maximum compression with lower response CPU cost. */
export const compressionOptions = {
  level: 6,
  memLevel: 8,
};

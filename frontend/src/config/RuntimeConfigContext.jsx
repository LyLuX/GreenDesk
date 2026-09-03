import { createContext, useEffect, useMemo, useState } from 'react';
import client from '../api/client.js';

export const DEFAULT_UPLOAD_LIMITS = Object.freeze({
  image: Object.freeze({ maxSizeMb: 10, maxSizeBytes: 10 * 1024 * 1024 }),
  document: Object.freeze({ maxSizeMb: 10, maxSizeBytes: 10 * 1024 * 1024 }),
});

export const RuntimeConfigContext = createContext({ uploadLimits: DEFAULT_UPLOAD_LIMITS });

const normalizeLimit = (limit, fallback) => {
  const maxSizeMb = Number(limit?.maxSizeMb);
  const maxSizeBytes = Number(limit?.maxSizeBytes);
  if (!Number.isInteger(maxSizeMb) || maxSizeMb < 1 || !Number.isInteger(maxSizeBytes)) {
    return fallback;
  }
  return { maxSizeMb, maxSizeBytes };
};

/** Loads the public runtime settings enforced by the API. */
export function RuntimeConfigProvider({ children }) {
  const [uploadLimits, setUploadLimits] = useState(DEFAULT_UPLOAD_LIMITS);

  useEffect(() => {
    const controller = new AbortController();
    client
      .get('/v1', { signal: controller.signal })
      .then(({ data }) => {
        const configuredLimits = data.data?.uploadLimits;
        setUploadLimits({
          image: normalizeLimit(configuredLimits?.image, DEFAULT_UPLOAD_LIMITS.image),
          document: normalizeLimit(configuredLimits?.document, DEFAULT_UPLOAD_LIMITS.document),
        });
      })
      .catch(() => {
        // Upload endpoints remain authoritative if runtime metadata is temporarily unavailable.
      });
    return () => controller.abort();
  }, []);

  const value = useMemo(() => ({ uploadLimits }), [uploadLimits]);
  return <RuntimeConfigContext.Provider value={value}>{children}</RuntimeConfigContext.Provider>;
}

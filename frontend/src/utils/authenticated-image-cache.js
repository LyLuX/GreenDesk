const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_IMAGES_PER_LOADER = 100;
let imageCache = new WeakMap();

/** Returns a cached protected blob and deduplicates concurrent authenticated requests. */
export const loadAuthenticatedImageBlob = (loadImage, fileUuid) => {
  let loaderCache = imageCache.get(loadImage);
  if (!loaderCache) {
    loaderCache = new Map();
    imageCache.set(loadImage, loaderCache);
  }
  const now = Date.now();
  const cached = loaderCache.get(fileUuid);
  if (cached && cached.expiresAt > now) {
    loaderCache.delete(fileUuid);
    loaderCache.set(fileUuid, cached);
    return cached.promise;
  }
  if (cached) loaderCache.delete(fileUuid);

  const promise = loadImage(fileUuid)
    .then((response) => response.data)
    .catch((error) => {
      if (loaderCache.get(fileUuid)?.promise === promise) loaderCache.delete(fileUuid);
      throw error;
    });
  loaderCache.set(fileUuid, { promise, expiresAt: now + CACHE_TTL_MS });
  while (loaderCache.size > MAX_IMAGES_PER_LOADER) {
    loaderCache.delete(loaderCache.keys().next().value);
  }
  return promise;
};

/** Invalidates protected image responses after an asset mutation. */
export const clearAuthenticatedImageCache = () => {
  imageCache = new WeakMap();
};

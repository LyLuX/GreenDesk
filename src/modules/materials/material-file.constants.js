/** MIME types accepted for material files and their server-controlled extensions. */
export const MIME_EXTENSION_MAP = Object.freeze({
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
});

export const PHOTO_MIME_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp']);
export const DOCUMENT_MIME_TYPES = Object.freeze(['application/pdf']);
export const DOCUMENT_TYPES = Object.freeze(['invoice', 'manual', 'certificate', 'other']);

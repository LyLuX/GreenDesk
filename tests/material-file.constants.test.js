import {
  DOCUMENT_MIME_TYPES,
  MIME_EXTENSION_MAP,
  PHOTO_MIME_TYPES,
} from '../src/modules/materials/material-file.constants.js';

describe('material file MIME rules', () => {
  it('uses server-controlled extensions for every allowed MIME type', () => {
    expect(MIME_EXTENSION_MAP).toEqual({
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
    });
    expect(PHOTO_MIME_TYPES).toContain('image/jpeg');
    expect(DOCUMENT_MIME_TYPES).toEqual(['application/pdf']);
  });
});

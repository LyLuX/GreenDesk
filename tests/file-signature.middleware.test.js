import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import express from 'express';
import multer from 'multer';
import request from 'supertest';
import { jest } from '@jest/globals';

import HTTP_STATUS from '../src/core/constants/http-status.js';
import { createFileSignatureValidator } from '../src/core/middlewares/file-signature.middleware.js';

const INVALID_IMAGE_MESSAGE =
  'Le contenu du fichier ne correspond pas à une signature JPEG, PNG ou WebP autorisée.';
const INVALID_PDF_MESSAGE =
  'Le contenu du fichier ne correspond pas à une signature PDF autorisée.';

const fixtures = {
  'image/jpeg': Buffer.from('ffd8ffe000104a46494600010100000100010000ffdb', 'hex'),
  'image/png': Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex'),
  'image/webp': Buffer.concat([
    Buffer.from('524946461a0000005745425056503820', 'hex'),
    Buffer.alloc(20),
  ]),
  'application/pdf': Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF'),
};

const extensions = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

describe('uploaded file signature validation', () => {
  let uploadDirectory;

  beforeEach(async () => {
    uploadDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'greendesk-signature-'));
  });

  afterEach(async () => {
    await fs.rm(uploadDirectory, { recursive: true, force: true });
  });

  const createUploadApp = (allowedMimeTypes, invalidTypeMessage) => {
    const app = express();
    const upload = multer({ dest: uploadDirectory });
    app.post(
      '/upload',
      upload.single('file'),
      createFileSignatureValidator(allowedMimeTypes, invalidTypeMessage),
      (uploadRequest, response) =>
        response.status(201).json({ mimeType: uploadRequest.file.mimetype }),
    );
    app.use((error, _request, response, _next) =>
      response.status(error.statusCode ?? 500).json({
        success: false,
        error: { message: error.message },
      }),
    );
    return app;
  };

  it.each(Object.entries(fixtures))('accepts a real %s file', async (mimeType, content) => {
    const allowedMimeTypes =
      mimeType === 'application/pdf' ? [mimeType] : Object.keys(fixtures).slice(0, 3);
    const response = await request(
      createUploadApp(
        allowedMimeTypes,
        mimeType === 'application/pdf' ? INVALID_PDF_MESSAGE : INVALID_IMAGE_MESSAGE,
      ),
    )
      .post('/upload')
      .attach('file', content, {
        filename: `valid.${extensions[mimeType]}`,
        contentType: mimeType,
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ mimeType });
    await expect(fs.readdir(uploadDirectory)).resolves.toHaveLength(1);
  });

  it.each([
    {
      label: 'a PNG declared as JPEG',
      content: fixtures['image/png'],
      declaredMimeType: 'image/jpeg',
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      message: INVALID_IMAGE_MESSAGE,
    },
    {
      label: 'plain text declared as PDF',
      content: Buffer.from('This is not a PDF document.'),
      declaredMimeType: 'application/pdf',
      allowedMimeTypes: ['application/pdf'],
      message: INVALID_PDF_MESSAGE,
    },
  ])(
    'rejects and removes $label',
    async ({ content, declaredMimeType, allowedMimeTypes, message }) => {
      const response = await request(createUploadApp(allowedMimeTypes, message))
        .post('/upload')
        .attach('file', content, {
          filename: `spoofed.${extensions[declaredMimeType]}`,
          contentType: declaredMimeType,
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ success: false, error: { message } });
      await expect(fs.readdir(uploadDirectory)).resolves.toEqual([]);
    },
  );

  it('removes a file when signature inspection cannot identify it', async () => {
    const removeFile = jest.fn().mockResolvedValue();
    const securityLogger = { warn: jest.fn(), error: jest.fn() };
    const next = jest.fn();
    const validator = createFileSignatureValidator(['application/pdf'], INVALID_PDF_MESSAGE, {
      detectFileType: jest.fn().mockRejectedValue(new Error('malformed input')),
      removeFile,
      securityLogger,
    });

    await validator({ file: { path: 'temporary-file', mimetype: 'application/pdf' } }, {}, next);

    expect(removeFile).toHaveBeenCalledWith('temporary-file');
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: INVALID_PDF_MESSAGE,
      }),
    );
  });

  it('fails closed and logs when a rejected file cannot be removed', async () => {
    const cleanupError = new Error('locked file');
    const securityLogger = { warn: jest.fn(), error: jest.fn() };
    const next = jest.fn();
    const validator = createFileSignatureValidator(['image/jpeg'], INVALID_IMAGE_MESSAGE, {
      detectFileType: jest.fn().mockResolvedValue({ mime: 'image/png', ext: 'png' }),
      removeFile: jest.fn().mockRejectedValue(cleanupError),
      securityLogger,
    });

    await validator({ file: { path: 'temporary-file', mimetype: 'image/jpeg' } }, {}, next);

    expect(securityLogger.error).toHaveBeenCalledWith(
      'Unable to remove rejected upload',
      expect.objectContaining({ error: cleanupError, filePath: 'temporary-file' }),
    );
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        message: 'Impossible de supprimer le fichier rejeté.',
      }),
    );
  });
});

import multer from 'multer';
import { PdfParseError } from '../services/pdfService.js';
import { env } from '../config/env.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Route not found.' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds the 10 MB size limit.' : err.message;
    return res.status(400).json({ error: message });
  }

  if (err instanceof PdfParseError) {
    return res.status(400).json({ error: err.message });
  }

  if (err.message === 'Only PDF files are allowed.') {
    return res.status(400).json({ error: err.message });
  }

  console.error('[errorHandler]', err);

  res.status(err.status || 500).json({
    error: 'Internal server error.',
    ...(env.nodeEnv !== 'production' ? { detail: err.message } : {}),
  });
}

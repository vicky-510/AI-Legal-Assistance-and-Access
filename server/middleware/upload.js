import multer from 'multer';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function pdfFileFilter(req, file, cb) {
  const isPdfMime = file.mimetype === 'application/pdf';
  const isPdfExt = file.originalname.toLowerCase().endsWith('.pdf');
  if (!isPdfMime || !isPdfExt) {
    return cb(new Error('Only PDF files are allowed.'));
  }
  cb(null, true);
}

// In-memory only — never written to disk. Buffer is discarded after the
// request completes (see pdfService.parsePdfBuffer callers).
export const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 2 },
  fileFilter: pdfFileFilter,
});

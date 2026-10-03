import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const router = Router();

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const IMAGE_DIR = path.join(UPLOAD_DIR, 'images');
const PDF_DIR = path.join(UPLOAD_DIR, 'pdf');

// Ensure upload directories exist
[UPLOAD_DIR, IMAGE_DIR, PDF_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PDF_SIZE = 25 * 1024 * 1024; // 25MB

// Magic byte validation helper
function validateImageMagicBytes(buffer: Buffer): { valid: boolean; ext: string; mime: string } {
  if (buffer.length < 4) return { valid: false, ext: '', mime: '' };

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { valid: true, ext: 'png', mime: 'image/png' };
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, ext: 'jpg', mime: 'image/jpeg' };
  }
  // WEBP: RIFF ... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer.length >= 12 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, ext: 'webp', mime: 'image/webp' };
  }

  return { valid: false, ext: '', mime: '' };
}

function validatePdfMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  // %PDF-
  return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
}

/**
 * POST /api/upload/image
 * Body: { filename?: string, dataUrl: string }
 */
router.post('/image', (req, res) => {
  try {
    const { filename, dataUrl } = req.body || {};
    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(400).json({ error: 'Missing image data URL.' });
    }

    const matches = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    let buffer: Buffer;

    if (matches && matches[2]) {
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(dataUrl.replace(/^data:[^;]+;base64,/, ''), 'base64');
    }

    if (buffer.length > MAX_IMAGE_SIZE) {
      return res.status(400).json({ error: 'Image exceeds maximum size limit of 10MB.' });
    }

    const { valid, ext, mime } = validateImageMagicBytes(buffer);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid or unsupported image file header.' });
    }

    const safeId = crypto.randomBytes(16).toString('hex');
    const safeFilename = `img_${safeId}.${ext}`;
    const filePath = path.join(IMAGE_DIR, safeFilename);

    fs.writeFileSync(filePath, buffer);

    const assetUrl = `/uploads/images/${safeFilename}`;
    return res.json({
      success: true,
      assetUrl,
      filename: safeFilename,
      mime,
      size: buffer.length,
    });
  } catch (error) {
    console.error('[Upload] Image upload error:', error);
    return res.status(500).json({ error: 'Failed to process image upload.' });
  }
});

/**
 * POST /api/upload/pdf
 * Body: { filename?: string, dataUrl: string }
 */
router.post('/pdf', (req, res) => {
  try {
    const { filename, dataUrl } = req.body || {};
    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(400).json({ error: 'Missing PDF data URL.' });
    }

    const buffer = Buffer.from(dataUrl.replace(/^data:[^;]+;base64,/, ''), 'base64');

    if (buffer.length > MAX_PDF_SIZE) {
      return res.status(400).json({ error: 'PDF exceeds maximum size limit of 25MB.' });
    }

    if (!validatePdfMagicBytes(buffer)) {
      return res.status(400).json({ error: 'Invalid PDF file header.' });
    }

    const safeId = crypto.randomBytes(16).toString('hex');
    const safeFilename = `doc_${safeId}.pdf`;
    const filePath = path.join(PDF_DIR, safeFilename);

    fs.writeFileSync(filePath, buffer);

    const pdfUrl = `/uploads/pdf/${safeFilename}`;
    return res.json({
      success: true,
      pdfUrl,
      filename: safeFilename,
      size: buffer.length,
    });
  } catch (error) {
    console.error('[Upload] PDF upload error:', error);
    return res.status(500).json({ error: 'Failed to process PDF upload.' });
  }
});

export default router;

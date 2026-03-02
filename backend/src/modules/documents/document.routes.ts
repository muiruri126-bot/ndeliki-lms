import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { authenticate, requireRole } from '../../middleware';
import { AuthenticatedRequest } from '../../types';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
router.use(authenticate);

// Configure multer for file uploads
const uploadDir = process.env.NODE_ENV === 'production'
  ? '/data/uploads'
  : path.join(__dirname, '..', '..', '..', 'uploads');

// Ensure upload dir exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('File type not allowed. Allowed: PDF, JPG, PNG, DOC, DOCX'));
  },
});

// List documents for a borrower
router.get(
  '/borrower/:borrowerId',
  requireRole('SYSTEM_ADMIN', 'LOAN_OFFICER', 'ACCOUNTANT'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const docs = await prisma.document.findMany({
        where: { borrowerId: req.params.borrowerId as string },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: docs });
    } catch (error) { next(error); }
  }
);

// Upload document
router.post(
  '/',
  requireRole('SYSTEM_ADMIN', 'LOAN_OFFICER'),
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
      const { borrowerId, loanId, documentType } = req.body;
      if (!borrowerId || !documentType) {
        return res.status(400).json({ success: false, message: 'borrowerId and documentType required' });
      }
      const doc = await prisma.document.create({
        data: {
          borrowerId: String(borrowerId),
          loanId: loanId ? String(loanId) : null,
          documentType: String(documentType),
          fileName: req.file.originalname,
          filePath: req.file.path,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          uploadedBy: req.user!.id,
        },
      });
      await prisma.auditLog.create({
        data: {
          userId: req.user!.id, action: 'DOCUMENT_UPLOADED',
          entityType: 'Document', entityId: doc.id,
          changes: JSON.stringify({ documentType, fileName: req.file.originalname }),
          ipAddress: (req.ip as string) || null,
        },
      });
      res.status(201).json({ success: true, data: doc });
    } catch (error) { next(error); }
  }
);

// Download document
router.get(
  '/:id/download',
  requireRole('SYSTEM_ADMIN', 'LOAN_OFFICER', 'ACCOUNTANT'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const doc = await prisma.document.findUnique({ where: { id: req.params.id as string } });
      if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
      if (!fs.existsSync(doc.filePath)) {
        return res.status(404).json({ success: false, message: 'File not found on disk' });
      }
      res.download(doc.filePath, doc.fileName);
    } catch (error) { next(error); }
  }
);

// Delete document
router.delete(
  '/:id',
  requireRole('SYSTEM_ADMIN'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const doc = await prisma.document.findUnique({ where: { id: req.params.id as string } });
      if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
      // Delete file from disk
      if (fs.existsSync(doc.filePath)) {
        fs.unlinkSync(doc.filePath);
      }
      await prisma.document.delete({ where: { id: req.params.id as string } });
      await prisma.auditLog.create({
        data: {
          userId: req.user!.id, action: 'DOCUMENT_DELETED',
          entityType: 'Document', entityId: doc.id,
          changes: JSON.stringify({ fileName: doc.fileName }),
          ipAddress: (req.ip as string) || null,
        },
      });
      res.json({ success: true, message: 'Document deleted' });
    } catch (error) { next(error); }
  }
);

export default router;

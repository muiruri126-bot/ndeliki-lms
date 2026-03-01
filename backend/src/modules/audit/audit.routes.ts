import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware';
import { prisma } from '../../config/database';
import { parsePagination, paginatedMeta, parseSort } from '../../utils/helpers';
import { AuthenticatedRequest } from '../../types';
import { Response, NextFunction } from 'express';

const router = Router();

router.use(authenticate);
router.use(requireRole('SYSTEM_ADMIN'));

router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { page, perPage, skip } = parsePagination(req.query as any);
    const orderBy = parseSort(req.query.sort as string, ['createdAt', 'action']);

    const where: any = {};
    const q = req.query as any;

    if (q.action) where.action = q.action;
    if (q.entityType) where.entityType = q.entityType;
    if (q.userId) where.userId = q.userId;
    if (q.dateFrom || q.dateTo) {
      where.createdAt = {};
      if (q.dateFrom) where.createdAt.gte = new Date(q.dateFrom);
      if (q.dateTo) where.createdAt.lte = new Date(q.dateTo);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy,
        skip,
        take: perPage,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      meta: paginatedMeta(total, page, perPage),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const log = await prisma.auditLog.findUnique({
      where: { id: req.params.id as string },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!log) {
      return res.status(404).json({ success: false, message: 'Audit log not found' });
    }

    res.json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
});

export default router;

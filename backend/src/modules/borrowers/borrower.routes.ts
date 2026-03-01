import { Router } from 'express';
import { borrowerController } from './borrower.controller';
import { authenticate, requireRole, validate } from '../../middleware';
import { createBorrowerSchema, updateBorrowerSchema, borrowerQuerySchema } from './borrower.schemas';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requireRole('SYSTEM_ADMIN', 'LOAN_OFFICER', 'ACCOUNTANT'),
  validate(borrowerQuerySchema, 'query'),
  borrowerController.list.bind(borrowerController)
);

router.get(
  '/:id',
  requireRole('SYSTEM_ADMIN', 'LOAN_OFFICER', 'ACCOUNTANT'),
  borrowerController.getById.bind(borrowerController)
);

router.get(
  '/:id/stats',
  requireRole('SYSTEM_ADMIN', 'LOAN_OFFICER', 'ACCOUNTANT'),
  borrowerController.getStats.bind(borrowerController)
);

router.post(
  '/',
  requireRole('SYSTEM_ADMIN', 'LOAN_OFFICER'),
  validate(createBorrowerSchema),
  borrowerController.create.bind(borrowerController)
);

router.put(
  '/:id',
  requireRole('SYSTEM_ADMIN', 'LOAN_OFFICER'),
  validate(updateBorrowerSchema),
  borrowerController.update.bind(borrowerController)
);

router.delete(
  '/:id',
  requireRole('SYSTEM_ADMIN'),
  borrowerController.deactivate.bind(borrowerController)
);

export default router;

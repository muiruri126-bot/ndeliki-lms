import { Router } from 'express';
import { loanController } from './loan.controller';
import { authenticate, requireRole, validate } from '../../middleware';
import {
  createLoanSchema,
  approveLoanSchema,
  disburseLoanSchema,
  loanQuerySchema,
  previewLoanSchema,
} from './loan.schemas';

const router = Router();

router.use(authenticate);

// Loan products
router.get('/products', loanController.getProducts.bind(loanController));

// Preview calculation (no persistence)
router.post(
  '/preview',
  requireRole('SYSTEM_ADMIN', 'LOAN_OFFICER'),
  validate(previewLoanSchema),
  loanController.preview.bind(loanController)
);

// CRUD
router.get(
  '/',
  requireRole('SYSTEM_ADMIN', 'LOAN_OFFICER', 'ACCOUNTANT'),
  validate(loanQuerySchema, 'query'),
  loanController.list.bind(loanController)
);

router.get(
  '/:id',
  requireRole('SYSTEM_ADMIN', 'LOAN_OFFICER', 'ACCOUNTANT'),
  loanController.getById.bind(loanController)
);

router.post(
  '/',
  requireRole('SYSTEM_ADMIN', 'LOAN_OFFICER'),
  validate(createLoanSchema),
  loanController.create.bind(loanController)
);

// Workflow actions
router.post(
  '/:id/approve',
  requireRole('SYSTEM_ADMIN', 'LOAN_OFFICER'),
  validate(approveLoanSchema),
  loanController.approve.bind(loanController)
);

router.post(
  '/:id/reject',
  requireRole('SYSTEM_ADMIN', 'LOAN_OFFICER'),
  loanController.reject.bind(loanController)
);

router.post(
  '/:id/disburse',
  requireRole('SYSTEM_ADMIN', 'LOAN_OFFICER'),
  validate(disburseLoanSchema),
  loanController.disburse.bind(loanController)
);

router.post(
  '/:id/write-off',
  requireRole('SYSTEM_ADMIN'),
  loanController.writeOff.bind(loanController)
);

export default router;

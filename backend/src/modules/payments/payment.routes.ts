import { Router } from 'express';
import { paymentController } from './payment.controller';
import { authenticate, requireRole, validate } from '../../middleware';
import { createPaymentSchema, reversePaymentSchema, paymentQuerySchema } from './payment.schemas';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requireRole('SYSTEM_ADMIN', 'LOAN_OFFICER', 'ACCOUNTANT'),
  validate(paymentQuerySchema, 'query'),
  paymentController.list.bind(paymentController)
);

router.get(
  '/:id',
  requireRole('SYSTEM_ADMIN', 'LOAN_OFFICER', 'ACCOUNTANT'),
  paymentController.getById.bind(paymentController)
);

router.post(
  '/',
  requireRole('SYSTEM_ADMIN', 'LOAN_OFFICER', 'ACCOUNTANT'),
  validate(createPaymentSchema),
  paymentController.create.bind(paymentController)
);

router.post(
  '/:id/reverse',
  requireRole('SYSTEM_ADMIN'),
  validate(reversePaymentSchema),
  paymentController.reverse.bind(paymentController)
);

export default router;

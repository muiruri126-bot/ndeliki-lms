import { Router } from 'express';
import { reportController } from './report.controller';
import { authenticate, requireRole } from '../../middleware';

const router = Router();

router.use(authenticate);
router.use(requireRole('SYSTEM_ADMIN', 'LOAN_OFFICER', 'ACCOUNTANT'));

router.get('/portfolio', reportController.portfolioSummary.bind(reportController));
router.get('/collections', reportController.collectionReport.bind(reportController));
router.get('/overdue', reportController.overdueReport.bind(reportController));
router.get('/officer-performance', reportController.officerPerformance.bind(reportController));

export default router;

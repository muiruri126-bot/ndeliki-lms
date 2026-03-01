import { Response, NextFunction } from 'express';
import { reportService } from './report.service';
import { AuthenticatedRequest } from '../../types';

export class ReportController {
  async portfolioSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await reportService.portfolioSummary();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async collectionReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { dateFrom, dateTo } = req.query as any;
      const data = await reportService.collectionReport(dateFrom, dateTo);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async overdueReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await reportService.overdueReport();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async officerPerformance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await reportService.officerPerformance();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const reportController = new ReportController();

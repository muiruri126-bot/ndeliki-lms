import { Response, NextFunction } from 'express';
import { borrowerService } from './borrower.service';
import { AuthenticatedRequest } from '../../types';

export class BorrowerController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await borrowerService.list(req.query as any);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const borrower = await borrowerService.getById(req.params.id as string);
      res.json({ success: true, data: borrower });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const borrower = await borrowerService.create(req.body, req.user!.id);
      res.status(201).json({ success: true, data: borrower });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const borrower = await borrowerService.update(req.params.id as string, req.body, req.user!.id);
      res.json({ success: true, data: borrower });
    } catch (error) {
      next(error);
    }
  }

  async deactivate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await borrowerService.deactivate(req.params.id as string, req.user!.id);
      res.json({ success: true, message: 'Borrower deactivated' });
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const stats = await borrowerService.getStats(req.params.id as string);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
}

export const borrowerController = new BorrowerController();

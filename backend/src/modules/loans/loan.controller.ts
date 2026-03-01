import { Response, NextFunction } from 'express';
import { loanService } from './loan.service';
import { AuthenticatedRequest } from '../../types';

export class LoanController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await loanService.list(req.query as any);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const loan = await loanService.getById(req.params.id as string);
      res.json({ success: true, data: loan });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const loan = await loanService.create(req.body, req.user!.id);
      res.status(201).json({ success: true, data: loan });
    } catch (error) {
      next(error);
    }
  }

  async approve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const loan = await loanService.approve(req.params.id as string, req.body, req.user!.id);
      res.json({ success: true, data: loan });
    } catch (error) {
      next(error);
    }
  }

  async reject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const loan = await loanService.reject(req.params.id as string, req.body.reason, req.user!.id);
      res.json({ success: true, data: loan });
    } catch (error) {
      next(error);
    }
  }

  async disburse(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const loan = await loanService.disburse(req.params.id as string, req.body, req.user!.id);
      res.json({ success: true, data: loan });
    } catch (error) {
      next(error);
    }
  }

  async preview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await loanService.preview(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async writeOff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await loanService.writeOff(req.params.id as string, req.body.reason, req.user!.id);
      res.json({ success: true, message: 'Loan written off' });
    } catch (error) {
      next(error);
    }
  }

  async getProducts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const products = await loanService.getProducts();
      res.json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  }
}

export const loanController = new LoanController();

import { Response, NextFunction } from 'express';
import { paymentService } from './payment.service';
import { AuthenticatedRequest } from '../../types';

export class PaymentController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.list(req.query as any);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const payment = await paymentService.getById(req.params.id as string);
      res.json({ success: true, data: payment });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const payment = await paymentService.create(req.body, req.user!.id);
      res.status(201).json({ success: true, data: payment });
    } catch (error) {
      next(error);
    }
  }

  async reverse(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await paymentService.reverse(req.params.id as string, req.body.reason, req.user!.id);
      res.json({ success: true, message: 'Payment reversed' });
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();

import { Response, NextFunction } from 'express';
import { userService } from './user.service';
import { AuthenticatedRequest } from '../../types';

export class UserController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await userService.list(req.query as any);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.getById(req.params.id as string);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.create(req.body, req.user!.id);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.update(req.params.id as string, req.body, req.user!.id);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async deactivate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await userService.deactivate(req.params.id as string, req.user!.id);
      res.json({ success: true, message: 'User deactivated' });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();

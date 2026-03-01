import { Router } from 'express';
import { userController } from './user.controller';
import { authenticate, requireRole, validate } from '../../middleware';
import { createUserSchema, updateUserSchema, userQuerySchema } from './user.schemas';

const router = Router();

// All user management routes require authentication + admin
router.use(authenticate);
router.use(requireRole('SYSTEM_ADMIN'));

router.get('/', validate(userQuerySchema, 'query'), userController.list.bind(userController));
router.get('/:id', userController.getById.bind(userController));
router.post('/', validate(createUserSchema), userController.create.bind(userController));
router.put('/:id', validate(updateUserSchema), userController.update.bind(userController));
router.delete('/:id', userController.deactivate.bind(userController));

export default router;

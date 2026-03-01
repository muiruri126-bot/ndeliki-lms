import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { BCRYPT_SALT_ROUNDS } from '../../config/constants';
import { ConflictError, NotFoundError, BadRequestError } from '../../utils/errors';
import { parsePagination, paginatedMeta, parseSort } from '../../utils/helpers';
import logger from '../../config/logger';
import type { CreateUserInput, UpdateUserInput, UserQuery } from './user.schemas';

export class UserService {
  private readonly userSelect = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    phone: true,
    isActive: true,
    mustChangePassword: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
    userRoles: {
      include: { role: { select: { id: true, name: true } } },
    },
  };

  async list(query: UserQuery) {
    const { page, perPage, skip } = parsePagination(query);
    const orderBy = parseSort(query.sort, ['firstName', 'lastName', 'email', 'createdAt']);

    const where: any = {};

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search } },
        { lastName: { contains: query.search } },
        { email: { contains: query.search } },
      ];
    }

    if (query.role) {
      where.userRoles = { some: { role: { name: query.role } } };
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: this.userSelect,
        orderBy,
        skip,
        take: perPage,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users.map(this.formatUser),
      meta: paginatedMeta(total, page, perPage),
    };
  }

  async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: this.userSelect,
    });

    if (!user) throw new NotFoundError('User not found');

    return this.formatUser(user);
  }

  async create(input: CreateUserInput, createdBy: string) {
    // Check duplicate email
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (existing) throw new ConflictError('A user with this email already exists');

    // Validate roles exist
    const roles = await prisma.role.findMany({
      where: { name: { in: input.roles } },
    });
    if (roles.length !== input.roles.length) {
      throw new BadRequestError('One or more roles are invalid');
    }

    const hashedPassword = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email.toLowerCase(),
        phone: input.phone,
        password: hashedPassword,
        mustChangePassword: true,
        isActive: input.isActive,
        userRoles: {
          create: roles.map((r) => ({ roleId: r.id })),
        },
      },
      select: this.userSelect,
    });

    await prisma.auditLog.create({
      data: {
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: user.id,
        userId: createdBy,
        changes: JSON.stringify({ firstName: input.firstName, lastName: input.lastName, email: input.email, roles: input.roles }),
      },
    });

    logger.info(`User created: ${input.email} by ${createdBy}`);

    return this.formatUser(user);
  }

  async update(id: string, input: UpdateUserInput, updatedBy: string) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('User not found');

    if (input.email && input.email.toLowerCase() !== existing.email) {
      const dup = await prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });
      if (dup) throw new ConflictError('A user with this email already exists');
    }

    // Update roles if provided
    if (input.roles) {
      const roles = await prisma.role.findMany({
        where: { name: { in: input.roles } },
      });
      if (roles.length !== input.roles.length) {
        throw new BadRequestError('One or more roles are invalid');
      }

      // Delete existing roles and recreate
      await prisma.userRole.deleteMany({ where: { userId: id } });
      await prisma.userRole.createMany({
        data: roles.map((r) => ({ userId: id, roleId: r.id })),
      });
    }

    const { roles: _roles, ...updateData } = input;

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...updateData,
        email: updateData.email?.toLowerCase(),
      },
      select: this.userSelect,
    });

    await prisma.auditLog.create({
      data: {
        action: 'USER_UPDATED',
        entityType: 'User',
        entityId: id,
        userId: updatedBy,
        changes: JSON.stringify(input),
      },
    });

    return this.formatUser(user);
  }

  async deactivate(id: string, deactivatedBy: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User not found');

    if (id === deactivatedBy) {
      throw new BadRequestError('Cannot deactivate your own account');
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        action: 'USER_DEACTIVATED',
        entityType: 'User',
        entityId: id,
        userId: deactivatedBy,
      },
    });

    logger.info(`User ${id} deactivated by ${deactivatedBy}`);
  }

  private formatUser(user: any) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt,
      roles: user.userRoles.map((ur: any) => ur.role.name),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export const userService = new UserService();

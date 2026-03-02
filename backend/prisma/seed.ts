import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Roles ──
  const roles = [
    {
      name: 'SYSTEM_ADMIN',
      description: 'Full system access. Manages users, config, and has override abilities.',
      permissions: JSON.stringify([
        'users:create', 'users:read', 'users:update', 'users:delete',
        'borrowers:create', 'borrowers:read:all', 'borrowers:update', 'borrowers:delete',
        'loans:create', 'loans:read:all', 'loans:update', 'loans:approve',
        'loans:write_off', 'loans:delete',
        'payments:create', 'payments:read:all', 'payments:reverse', 'payments:adjust',
        'reports:financial', 'reports:portfolio', 'reports:export',
        'system:config', 'audit:read',
        'data:import', 'data:export',
        'notifications:config', 'documents:manage',
      ]),
      isSystem: true,
    },
    {
      name: 'LOAN_OFFICER',
      description: 'Creates borrowers, originates loans, manages collections.',
      permissions: JSON.stringify([
        'borrowers:create', 'borrowers:read:assigned', 'borrowers:update',
        'loans:create', 'loans:read:assigned', 'loans:update', 'loans:approve',
        'payments:create', 'payments:read:all',
        'reports:portfolio',
        'documents:manage',
      ]),
      isSystem: true,
    },
    {
      name: 'ACCOUNTANT',
      description: 'Financial operations, reconciliation, reporting.',
      permissions: JSON.stringify([
        'borrowers:read:all',
        'loans:read:all',
        'payments:create', 'payments:read:all', 'payments:adjust',
        'reports:financial', 'reports:export',
        'audit:read',
      ]),
      isSystem: true,
    },
    {
      name: 'BORROWER',
      description: 'External users. Self-service access to own loan data.',
      permissions: JSON.stringify([
        'borrowers:read:own',
        'loans:read:own',
        'payments:read:own',
      ]),
      isSystem: true,
    },
    {
      name: 'INVESTOR',
      description: 'View funded loan portfolio and returns (future).',
      permissions: JSON.stringify([
        'loans:read:funded',
        'reports:portfolio',
      ]),
      isSystem: true,
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description, permissions: role.permissions },
      create: role,
    });
  }
  console.log('  ✅ Roles seeded');

  // ── Admin User ──
  const adminRole = await prisma.role.findUnique({ where: { name: 'SYSTEM_ADMIN' } });
  if (!adminRole) throw new Error('SYSTEM_ADMIN role not found');

  const adminPasswordHash = await bcrypt.hash('Admin@2026!', 12);

  // Find or create admin user, always reset password & unlock
  let adminUser = await prisma.user.findUnique({ where: { email: 'admin@ndeliki.co.ke' } });
  if (adminUser) {
    adminUser = await prisma.user.update({
      where: { id: adminUser.id },
      data: { password: adminPasswordHash, failedLoginAttempts: 0, lockedUntil: null, isActive: true },
    });
  } else {
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@ndeliki.co.ke',
        phone: `admin-${Date.now()}`,
        password: adminPasswordHash,
        firstName: 'System',
        lastName: 'Administrator',
        isActive: true,
        isEmailVerified: true,
        mustChangePassword: false,
      },
    });
  }

  // Assign admin role
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });
  console.log('  ✅ Admin user seeded (admin@ndeliki.co.ke / Admin@2026!)');

  // ── Default Loan Officer ──
  const officerRole = await prisma.role.findUnique({ where: { name: 'LOAN_OFFICER' } });
  if (!officerRole) throw new Error('LOAN_OFFICER role not found');

  const officerPasswordHash = await bcrypt.hash('Officer@2026!', 12);

  let officerUser = await prisma.user.findUnique({ where: { email: 'officer@ndeliki.co.ke' } });
  if (officerUser) {
    officerUser = await prisma.user.update({
      where: { id: officerUser.id },
      data: { password: officerPasswordHash, failedLoginAttempts: 0, lockedUntil: null, isActive: true },
    });
  } else {
    officerUser = await prisma.user.create({
      data: {
        email: 'officer@ndeliki.co.ke',
        phone: `officer-${Date.now()}`,
        password: officerPasswordHash,
        firstName: 'Benard',
        lastName: 'Muiruri',
        isActive: true,
        isEmailVerified: true,
        mustChangePassword: true,
      },
    });
  }

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: officerUser.id, roleId: officerRole.id } },
    update: {},
    create: {
      userId: officerUser.id,
      roleId: officerRole.id,
    },
  });
  console.log('  ✅ Loan officer seeded (officer@ndeliki.co.ke / Officer@2026!)');

  // ── Default Loan Product ──
  await prisma.loanProduct.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Weekly Flat Rate',
      description: 'Standard Ndeliki weekly repayment loan with flat interest. This matches the legacy system calculation: Total Due = Principal + (Principal × Rate / 100).',
      interestMethod: 'FLAT',
      interestRate: 30,
      interestPeriod: 'TOTAL',
      durationUnit: 'WEEKS',
      repaymentFrequency: 'WEEKLY',
      minAmount: 1000,
      maxAmount: 100000,
      minDurationUnits: 1,
      maxDurationUnits: 52,
      penaltyRate: 0,
      penaltyGraceDays: 0,
      requiresApproval: true,
      approvalLimit: 50000,
      isActive: true,
    },
  });

  await prisma.loanProduct.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Monthly Reducing Balance',
      description: 'Monthly repayment loan with reducing balance interest calculation.',
      interestMethod: 'REDUCING_BALANCE',
      interestRate: 24,
      interestPeriod: 'ANNUAL',
      durationUnit: 'MONTHS',
      repaymentFrequency: 'MONTHLY',
      minAmount: 5000,
      maxAmount: 500000,
      minDurationUnits: 1,
      maxDurationUnits: 24,
      penaltyRate: 2,
      penaltyGraceDays: 7,
      requiresApproval: true,
      approvalLimit: 100000,
      isActive: true,
    },
  });
  console.log('  ✅ Loan products seeded');

  // ── System Config ──
  const configs = [
    { key: 'company_name', value: '"NDELIKI LIMITED"', description: 'Company display name' },
    { key: 'company_tagline', value: '"We grow, you grow"', description: 'Company tagline' },
    { key: 'default_currency', value: '"KES"', description: 'Default currency code' },
    {
      key: 'penalty_config',
      value: JSON.stringify({ method: 'percentage', rate: 2, frequency: 'monthly', graceDays: 7 }),
      description: 'Default penalty calculation configuration',
    },
    {
      key: 'loan_number_format',
      value: JSON.stringify({ prefix: 'NDL', separator: '-', yearFormat: 'YYYY', sequencePadding: 4 }),
      description: 'Loan number generation format',
    },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: {
        key: config.key,
        value: config.value,
        description: config.description,
      },
    });
  }
  console.log('  ✅ System config seeded');

  console.log('\n🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

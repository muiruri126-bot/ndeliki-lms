import app from './app';
import { env } from './config/env';
import logger from './config/logger';
import { prisma } from './config/database';
import { startOverdueChecker } from './jobs/overdueChecker';

async function main() {
  // Test database connection
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Failed to connect to database', error);
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`NDELIKI LMS API server running on port ${env.PORT} [${env.NODE_ENV}]`);

    // Start scheduled jobs
    startOverdueChecker();
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Database disconnected');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});

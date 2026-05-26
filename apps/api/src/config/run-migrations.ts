import { Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { createMigrationDataSource } from './migration-data-source';

interface SafeMigrationError {
  errorName: string;
  errorCode?: string;
}

function sanitizeMigrationError(error: unknown): SafeMigrationError {
  // VI: Loi migration chi log ma loi an toan, khong lo query, credential hoac stack trace.
  const code = error && typeof error === 'object' && 'code' in error ? (error as { code?: unknown }).code : undefined;

  return {
    errorName: error instanceof Error ? error.name : 'UnknownError',
    errorCode: typeof code === 'string' || typeof code === 'number' ? String(code) : undefined,
  };
}

// VI: Runner tai bien moi truong API va chay migration TypeORM mot cach chu dong.
async function runMigrations(): Promise<void> {
  ConfigModule.forRoot({ envFilePath: ['.env.local', '.env'] });
  const logger = new Logger('MigrationRunner');
  const dataSource = createMigrationDataSource();

  try {
    await dataSource.initialize();
    const applied = await dataSource.runMigrations();
    logger.log(`Applied ${applied.length} database migration(s).`);
  } catch (error) {
    logger.error({
      module: 'MigrationRunner',
      action: 'runMigrations',
      message: 'Database migration failed.',
      ...sanitizeMigrationError(error),
    });
    process.exitCode = 1;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void runMigrations();

import { DataSource, DataSourceOptions } from 'typeorm';

// VI: Data source rieng cho migration; khong bat synchronize khi cap nhat schema trien khai.
export function createMigrationDataSource(): DataSource {
  const options: DataSourceOptions = {
    type: 'mysql',
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 3306),
    username: process.env.DATABASE_USER ?? 'glass_app',
    password: process.env.DATABASE_PASSWORD ?? '',
    database: process.env.DATABASE_NAME ?? 'glass_demo_visualizer',
    synchronize: false,
    migrations: [`${__dirname}/../migrations/*{.ts,.js}`],
  };

  return new DataSource(options);
}

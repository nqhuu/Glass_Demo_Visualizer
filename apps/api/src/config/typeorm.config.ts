import { TypeOrmModuleOptions } from '@nestjs/typeorm';

// VI: Tao cau hinh MySQL tu bien moi truong, khong hard-code thong tin nhay cam.
export function createTypeOrmOptions(): TypeOrmModuleOptions {
  return {
    type: 'mysql',
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 3306),
    username: process.env.DATABASE_USER ?? 'glass_app',
    password: process.env.DATABASE_PASSWORD ?? '',
    database: process.env.DATABASE_NAME ?? 'glass_demo_visualizer',
    entities: [],
    // VI: Chi bat synchronize khi local dev chu dong cau hinh; production khong nen tu dong sua schema.
    synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
    autoLoadEntities: true,
  };
}

import { TypeOrmModuleOptions } from '@nestjs/typeorm';

// VI: Tao cau hinh MySQL tu bien moi truong, khong hard-code thong tin nhay cam.
export function createTypeOrmOptions(): TypeOrmModuleOptions {
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_PASSWORD) {
    // VI: Production phai co password DB qua env; dung khoi dong hon la ket noi sai an toan.
    throw new Error('Missing production database credential configuration.');
  }

  if (process.env.NODE_ENV === 'production' && process.env.DATABASE_SYNCHRONIZE === 'true') {
    // VI: Khong cho TypeORM tu dong sua schema trong production.
    throw new Error('Unsafe production database synchronize configuration.');
  }

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

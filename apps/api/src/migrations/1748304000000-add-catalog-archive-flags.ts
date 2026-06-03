import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

// VI: Them co archive mem cho catalog de tach inactive va removed ma khong pha du lieu da gan region.
export class AddCatalogArchiveFlags1748304000000 implements MigrationInterface {
  name = 'AddCatalogArchiveFlags1748304000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('glass_products', 'is_archived'))) {
      await queryRunner.addColumn('glass_products', new TableColumn({ name: 'is_archived', type: 'boolean', default: false }));
    }

    if (!(await queryRunner.hasColumn('glass_categories', 'is_archived'))) {
      await queryRunner.addColumn('glass_categories', new TableColumn({ name: 'is_archived', type: 'boolean', default: false }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('glass_products', 'is_archived')) {
      await queryRunner.dropColumn('glass_products', 'is_archived');
    }

    if (await queryRunner.hasColumn('glass_categories', 'is_archived')) {
      await queryRunner.dropColumn('glass_categories', 'is_archived');
    }
  }
}

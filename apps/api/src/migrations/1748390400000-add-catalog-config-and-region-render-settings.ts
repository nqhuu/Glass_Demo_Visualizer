import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';

// VI: Them bang config admin va cot render o region ma khong dung synchronize production.
export class AddCatalogConfigAndRegionRenderSettings1748390400000 implements MigrationInterface {
  name = 'AddCatalogConfigAndRegionRenderSettings1748390400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('glass_material_types'))) {
      await queryRunner.createTable(
        new Table({
          name: 'glass_material_types',
          columns: [
            { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'name', type: 'varchar', length: '160' },
            { name: 'code', type: 'varchar', length: '80', isUnique: true },
            { name: 'description', type: 'varchar', length: '800', isNullable: true },
            { name: 'is_active', type: 'tinyint', default: 1 },
            { name: 'is_archived', type: 'tinyint', default: 0 },
            { name: 'sort_order', type: 'int', default: 0 },
            { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
            { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
          ],
        }),
      );
    }

    if (!(await queryRunner.hasTable('glass_render_presets'))) {
      await queryRunner.createTable(
        new Table({
          name: 'glass_render_presets',
          columns: [
            { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'name', type: 'varchar', length: '160' },
            { name: 'code', type: 'varchar', length: '80', isUnique: true },
            { name: 'description', type: 'varchar', length: '800', isNullable: true },
            { name: 'default_tint_percent', type: 'int', default: 25 },
            { name: 'default_reflectivity_percent', type: 'int', default: 35 },
            { name: 'default_transmission_percent', type: 'int', default: 65 },
            { name: 'default_shadow_percent', type: 'int', default: 20 },
            { name: 'is_active', type: 'tinyint', default: 1 },
            { name: 'is_archived', type: 'tinyint', default: 0 },
            { name: 'sort_order', type: 'int', default: 0 },
            { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
            { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
          ],
        }),
      );
    }

    await this.addColumnIfMissing(queryRunner, 'glass_products', new TableColumn({ name: 'material_type_id', type: 'int', isNullable: true }));
    await this.addColumnIfMissing(queryRunner, 'glass_products', new TableColumn({ name: 'render_preset_id', type: 'int', isNullable: true }));
    await this.addColumnIfMissing(queryRunner, 'glass_regions', new TableColumn({ name: 'render_preset_id', type: 'int', isNullable: true }));
    await this.addColumnIfMissing(queryRunner, 'glass_regions', new TableColumn({ name: 'applied_tint_percent', type: 'int', isNullable: true }));
    await this.addColumnIfMissing(queryRunner, 'glass_regions', new TableColumn({ name: 'applied_reflectivity_percent', type: 'int', isNullable: true }));
    await this.addColumnIfMissing(queryRunner, 'glass_regions', new TableColumn({ name: 'applied_transmission_percent', type: 'int', isNullable: true }));
    await this.addColumnIfMissing(queryRunner, 'glass_regions', new TableColumn({ name: 'applied_shadow_percent', type: 'int', isNullable: true }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const columnName of ['applied_shadow_percent', 'applied_transmission_percent', 'applied_reflectivity_percent', 'applied_tint_percent', 'render_preset_id']) {
      if (await queryRunner.hasColumn('glass_regions', columnName)) {
        await queryRunner.dropColumn('glass_regions', columnName);
      }
    }
    for (const columnName of ['render_preset_id', 'material_type_id']) {
      if (await queryRunner.hasColumn('glass_products', columnName)) {
        await queryRunner.dropColumn('glass_products', columnName);
      }
    }
    if (await queryRunner.hasTable('glass_render_presets')) {
      await queryRunner.dropTable('glass_render_presets');
    }
    if (await queryRunner.hasTable('glass_material_types')) {
      await queryRunner.dropTable('glass_material_types');
    }
  }

  private async addColumnIfMissing(queryRunner: QueryRunner, tableName: string, column: TableColumn): Promise<void> {
    if (!(await queryRunner.hasColumn(tableName, column.name))) {
      await queryRunner.addColumn(tableName, column);
    }
  }
}

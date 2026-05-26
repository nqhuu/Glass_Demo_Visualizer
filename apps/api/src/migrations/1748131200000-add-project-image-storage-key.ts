import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

// VI: Them khoa luu tru noi bo nullable de DB cu tiep tuc hoat dong voi URL anh legacy.
export class AddProjectImageStorageKey1748131200000 implements MigrationInterface {
  name = 'AddProjectImageStorageKey1748131200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('project_images', 'storage_key')) {
      return;
    }

    await queryRunner.addColumn(
      'project_images',
      new TableColumn({
        name: 'storage_key',
        type: 'varchar',
        length: '700',
        isNullable: true,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('project_images', 'storage_key')) {
      await queryRunner.dropColumn('project_images', 'storage_key');
    }
  }
}

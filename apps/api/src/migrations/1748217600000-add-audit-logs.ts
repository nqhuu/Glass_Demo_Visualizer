import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

// VI: Migration tao bang audit nullable/khong nhay cam ma khong can bat synchronize tren production.
export class AddAuditLogs1748217600000 implements MigrationInterface {
  name = 'AddAuditLogs1748217600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('audit_logs')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'audit_logs',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'actor_user_id', type: 'int', isNullable: true },
          { name: 'actor_name_snapshot', type: 'varchar', length: '160', isNullable: true },
          { name: 'actor_role', type: 'enum', enum: ['admin', 'user'], isNullable: true },
          { name: 'action', type: 'varchar', length: '80' },
          { name: 'entity_type', type: 'varchar', length: '60' },
          { name: 'entity_id', type: 'int', isNullable: true },
          { name: 'project_id', type: 'int', isNullable: true },
          { name: 'image_id', type: 'int', isNullable: true },
          { name: 'status', type: 'enum', enum: ['success', 'failure'], default: "'success'" },
          { name: 'safe_message', type: 'varchar', length: '240', isNullable: true },
          { name: 'metadata_json', type: 'json', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );
    await queryRunner.createIndex('audit_logs', new TableIndex({ name: 'IDX_audit_logs_created_at', columnNames: ['created_at'] }));
    await queryRunner.createIndex('audit_logs', new TableIndex({ name: 'IDX_audit_logs_action', columnNames: ['action'] }));
    await queryRunner.createIndex('audit_logs', new TableIndex({ name: 'IDX_audit_logs_project_id', columnNames: ['project_id'] }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('audit_logs')) {
      await queryRunner.dropTable('audit_logs');
    }
  }
}

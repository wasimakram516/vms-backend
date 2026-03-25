import { MigrationInterface, QueryRunner } from 'typeorm';

export class ApprovedTimezone1774195960178 implements MigrationInterface {
  name = 'ApprovedTimezone1774195960178';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "registrations" ADD IF NOT EXISTS "approvedTimezone" character varying NOT NULL DEFAULT 'UTC'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "registrations" DROP COLUMN IF EXISTS "approvedTimezone"`,
    );
  }
}

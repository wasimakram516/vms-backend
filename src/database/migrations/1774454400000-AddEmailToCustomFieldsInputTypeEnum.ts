import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailToCustomFieldsInputTypeEnum1774454400000
  implements MigrationInterface
{
  name = "AddEmailToCustomFieldsInputTypeEnum1774454400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = 'public'
            AND t.typname = 'custom_fields_inputtype_enum'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          JOIN pg_enum e ON e.enumtypid = t.oid
          WHERE n.nspname = 'public'
            AND t.typname = 'custom_fields_inputtype_enum'
            AND e.enumlabel = 'email'
        ) THEN
          ALTER TYPE "public"."custom_fields_inputtype_enum" ADD VALUE 'email';
        END IF;
      END
      $$;
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL enum values cannot be safely removed in-place.
  }
}

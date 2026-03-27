import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateNdaTemplateRichText1774547604959 implements MigrationInterface {
    name = 'UpdateNdaTemplateRichText1774547604959'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "nda_templates" DROP COLUMN "fileUrl"`);
        await queryRunner.query(`ALTER TABLE "nda_templates" ADD "preamble" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "nda_templates" ADD "body" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "nda_templates" ADD "visitorRecordTitle" character varying`);
        await queryRunner.query(`ALTER TABLE "nda_templates" ADD "visitorRecordNote" text`);
        await queryRunner.query(`ALTER TABLE "nda_templates" ADD "footer" text`);
        await queryRunner.query(`ALTER TABLE "nda_templates" ALTER COLUMN "isActive" SET DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "nda_templates" ALTER COLUMN "isActive" SET DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "nda_templates" DROP COLUMN "footer"`);
        await queryRunner.query(`ALTER TABLE "nda_templates" DROP COLUMN "visitorRecordNote"`);
        await queryRunner.query(`ALTER TABLE "nda_templates" DROP COLUMN "visitorRecordTitle"`);
        await queryRunner.query(`ALTER TABLE "nda_templates" DROP COLUMN "body"`);
        await queryRunner.query(`ALTER TABLE "nda_templates" DROP COLUMN "preamble"`);
        await queryRunner.query(`ALTER TABLE "nda_templates" ADD "fileUrl" character varying`);
    }

}

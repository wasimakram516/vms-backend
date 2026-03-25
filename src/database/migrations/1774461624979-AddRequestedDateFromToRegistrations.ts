import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRequestedDateFromToRegistrations1774461624979 implements MigrationInterface {
    name = 'AddRequestedDateFromToRegistrations1774461624979'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "registrations" DROP COLUMN "requestedDate"`);
        await queryRunner.query(`ALTER TABLE "registrations" DROP COLUMN "approvedDate"`);
        await queryRunner.query(`ALTER TABLE "registrations" ADD "requestedDateFrom" date`);
        await queryRunner.query(`ALTER TABLE "registrations" ADD "requestedDateTo" date`);
        await queryRunner.query(`UPDATE "registrations" SET "requestedDateFrom" = NOW(), "requestedDateTo" = NOW() WHERE "requestedDateFrom" IS NULL`);
        await queryRunner.query(`ALTER TABLE "registrations" ALTER COLUMN "requestedDateFrom" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "registrations" ALTER COLUMN "requestedDateTo" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "registrations" ADD "approvedDateFrom" date`);
        await queryRunner.query(`ALTER TABLE "registrations" ADD "approvedDateTo" date`);
        await queryRunner.query(`ALTER TABLE "registrations" ALTER COLUMN "approvedTimezone" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "registrations" ALTER COLUMN "approvedTimezone" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "registrations" DROP COLUMN "approvedDateTo"`);
        await queryRunner.query(`ALTER TABLE "registrations" DROP COLUMN "approvedDateFrom"`);
        await queryRunner.query(`ALTER TABLE "registrations" DROP COLUMN "requestedDateTo"`);
        await queryRunner.query(`ALTER TABLE "registrations" DROP COLUMN "requestedDateFrom"`);
        await queryRunner.query(`ALTER TABLE "registrations" ADD "approvedDate" date`);
        await queryRunner.query(`ALTER TABLE "registrations" ADD "requestedDate" date NOT NULL`);
    }

}

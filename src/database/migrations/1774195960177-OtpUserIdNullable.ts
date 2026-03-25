import { MigrationInterface, QueryRunner } from "typeorm";

export class OtpUserIdNullable1774195960177 implements MigrationInterface {
    name = 'OtpUserIdNullable1774195960177'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "otp_verifications" ALTER COLUMN "userId" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "otp_verifications" ALTER COLUMN "userId" SET NOT NULL`);
    }
}

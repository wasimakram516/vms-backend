import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNdaFormUrlToUserNdaAcceptances1774642001274 implements MigrationInterface {
    name = 'AddNdaFormUrlToUserNdaAcceptances1774642001274'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_nda_acceptances" ADD "ndaFormUrl" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_nda_acceptances" DROP COLUMN "ndaFormUrl"`);
    }

}

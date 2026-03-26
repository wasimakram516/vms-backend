import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHostsTable1774529673760 implements MigrationInterface {
    name = 'AddHostsTable1774529673760'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "hosts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "email" character varying NOT NULL, "phone" character varying, "address" character varying, "website" character varying, "logoUrl" character varying, "contactPersonName" character varying, "contactPersonEmail" character varying, "contactPersonPhone" character varying, "createdById" uuid, "updatedById" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c4bcf0826e0e2847faee4da1746" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "hosts" ADD CONSTRAINT "FK_52e81010333d5b587112e5730fa" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "hosts" ADD CONSTRAINT "FK_ca8dd8a71100e5b8257b8730172" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "hosts" DROP CONSTRAINT "FK_ca8dd8a71100e5b8257b8730172"`);
        await queryRunner.query(`ALTER TABLE "hosts" DROP CONSTRAINT "FK_52e81010333d5b587112e5730fa"`);
        await queryRunner.query(`DROP TABLE "hosts"`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1774195960175 implements MigrationInterface {
    name = 'InitialSchema1774195960175'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."users_role_enum" AS ENUM('superadmin', 'admin', 'staff', 'visitor'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."users_stafftype_enum" AS ENUM('gate', 'kitchen', 'reception', 'security'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "role" "public"."users_role_enum" NOT NULL, "fullName" character varying NOT NULL, "email" character varying NOT NULL, "phone" character varying, "passwordHash" character varying NOT NULL, "staffType" "public"."users_stafftype_enum", "companyName" character varying, "idNo" character varying, "defaultPurpose" character varying, "isEmailVerified" boolean NOT NULL DEFAULT false, "isPhoneVerified" boolean NOT NULL DEFAULT false, "status" character varying NOT NULL DEFAULT 'active', "createdById" uuid, "updatedById" uuid, "lastLoginAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_a000cca60bcf04454e727699490" UNIQUE ("phone"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "nda_templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "version" integer NOT NULL, "fileUrl" character varying, "isActive" boolean NOT NULL DEFAULT true, "createdById" uuid, "updatedById" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b76cf3f67dc77a98552b225778a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "user_nda_acceptances" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "ndaTemplateId" uuid NOT NULL, "signedName" character varying, "signatureFileUrl" character varying, "ipAddress" character varying, "userAgent" character varying, "acceptedAt" TIMESTAMP NOT NULL, "createdById" uuid, "updatedById" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9f5f5763ec96f502794cd750509" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "badge_templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "isDefault" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT true, "layoutJson" jsonb, "createdById" uuid, "updatedById" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e9bcbe1eccd23608f4e99814428" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "qr_templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "isDefault" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT true, "configJson" jsonb, "createdById" uuid, "updatedById" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6743af0a258811f27ab88e3b014" PRIMARY KEY ("id"))`);
        await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."registrations_status_enum" AS ENUM('pending', 'approved', 'rejected', 'checked_in', 'checked_out', 'cancelled', 'expired'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "registrations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "ndaAcceptanceId" uuid, "badgeTemplateId" uuid, "qrTemplateId" uuid, "requestedDate" date NOT NULL, "requestedTimeFrom" TIME NOT NULL, "requestedTimeTo" TIME NOT NULL, "approvedDate" date, "approvedTimeFrom" TIME, "approvedTimeTo" TIME, "purposeOfVisit" character varying, "status" "public"."registrations_status_enum" NOT NULL DEFAULT 'pending', "rejectionReason" text, "approvedByUserId" uuid, "approvedAt" TIMESTAMP, "qrToken" character varying, "checkedInAt" TIMESTAMP, "checkedOutAt" TIMESTAMP, "createdById" uuid, "updatedById" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_63bc694d24dd694880b05bfa832" UNIQUE ("qrToken"), CONSTRAINT "PK_6013e724d7b22929da9cd7282d1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."custom_fields_inputtype_enum" AS ENUM('text', 'email', 'textarea', 'number', 'phone', 'select', 'radio', 'checkbox', 'date', 'time', 'file'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "custom_fields" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fieldKey" character varying NOT NULL, "label" character varying NOT NULL, "inputType" "public"."custom_fields_inputtype_enum" NOT NULL, "isRequired" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT true, "sortOrder" integer NOT NULL DEFAULT '0', "optionsJson" jsonb, "createdById" uuid, "updatedById" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_11604c7d26df8022a85bc582a27" UNIQUE ("fieldKey"), CONSTRAINT "PK_35ab958a0baec2e0b2b2b875fdb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "registration_field_values" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "registrationId" uuid NOT NULL, "customFieldId" uuid NOT NULL, "value" jsonb NOT NULL, "createdById" uuid, "updatedById" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_803f1b9a16b486679e502e48565" PRIMARY KEY ("id"))`);
        await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."registration_activity_logs_activitytype_enum" AS ENUM('submitted', 'approved', 'rejected', 'nda_signed', 'qr_generated', 'scanned', 'badge_printed', 'checked_in', 'checked_out'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "registration_activity_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "registrationId" uuid NOT NULL, "actorUserId" uuid, "activityType" "public"."registration_activity_logs_activitytype_enum" NOT NULL, "notes" text, "metadata" jsonb, "createdById" uuid, "updatedById" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_080ec0de59820f9f68ffc3df444" PRIMARY KEY ("id"))`);
        await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."otp_verifications_channel_enum" AS ENUM('email', 'sms'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "otp_verifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "channel" "public"."otp_verifications_channel_enum" NOT NULL, "target" character varying NOT NULL, "purpose" character varying NOT NULL, "codeHash" character varying NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "verifiedAt" TIMESTAMP, "createdById" uuid, "updatedById" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_91d17e75ac3182dba6701869b39" PRIMARY KEY ("id"))`);
        await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."audit_logs_action_enum" AS ENUM('create', 'update', 'delete', 'approve', 'reject', 'status_override', 'login', 'logout'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "actorUserId" uuid, "entityType" character varying NOT NULL, "entityId" uuid NOT NULL, "action" "public"."audit_logs_action_enum" NOT NULL, "beforeData" jsonb, "afterData" jsonb, "ipAddress" character varying, "userAgent" character varying, "createdById" uuid, "updatedById" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "users" ADD CONSTRAINT "FK_51d635f1d983d505fb5a2f44c52" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "users" ADD CONSTRAINT "FK_52e97c477859f8019f3705abd21" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "nda_templates" ADD CONSTRAINT "FK_f57849f579d9ed6d934e1e48073" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "nda_templates" ADD CONSTRAINT "FK_167b8d40c4a02de129dfb285156" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "user_nda_acceptances" ADD CONSTRAINT "FK_edfb5e780889320c4db85df235f" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "user_nda_acceptances" ADD CONSTRAINT "FK_150d6175232c69ad031e2362e84" FOREIGN KEY ("ndaTemplateId") REFERENCES "nda_templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "user_nda_acceptances" ADD CONSTRAINT "FK_98ceeefa643578d5aa9a3b9ed74" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "user_nda_acceptances" ADD CONSTRAINT "FK_8ec901a14048b5ea7f4f75646ac" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "badge_templates" ADD CONSTRAINT "FK_8740c20ead7348a30a7c51ade9c" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "badge_templates" ADD CONSTRAINT "FK_9e890787179c66e34a6eb67284a" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "qr_templates" ADD CONSTRAINT "FK_96889215363459a0af2b0c8ef98" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "qr_templates" ADD CONSTRAINT "FK_a0fd7d4d0653640ed0d3a4bab47" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "registrations" ADD CONSTRAINT "FK_7e5ae7aa55bb98b8b9dcbe32ca3" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "registrations" ADD CONSTRAINT "FK_b1d9b1fa775b09cc2284623646a" FOREIGN KEY ("ndaAcceptanceId") REFERENCES "user_nda_acceptances"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "registrations" ADD CONSTRAINT "FK_b00010b17b38f2e751b9778f369" FOREIGN KEY ("badgeTemplateId") REFERENCES "badge_templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "registrations" ADD CONSTRAINT "FK_0c30fadec0cb9ac9e569a5bd697" FOREIGN KEY ("qrTemplateId") REFERENCES "qr_templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "registrations" ADD CONSTRAINT "FK_82d7f24c99a66acb967e7b13933" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "registrations" ADD CONSTRAINT "FK_d25742f5db193288c208918489a" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "registrations" ADD CONSTRAINT "FK_1be84060b881dcf77ef00e9b557" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "custom_fields" ADD CONSTRAINT "FK_3d5a5d59ca7fd5b965e129b127f" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "custom_fields" ADD CONSTRAINT "FK_c110f6eb57e7ea7b9fd62332324" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "registration_field_values" ADD CONSTRAINT "FK_15ebc1a99932aa1a9c3c1d2b9a7" FOREIGN KEY ("registrationId") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "registration_field_values" ADD CONSTRAINT "FK_01100e190bbf659018271d4f472" FOREIGN KEY ("customFieldId") REFERENCES "custom_fields"("id") ON DELETE CASCADE ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "registration_field_values" ADD CONSTRAINT "FK_c7fc5cbb55b1b4c97d31a974b7f" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "registration_field_values" ADD CONSTRAINT "FK_57abcb300b3b1897a41b39f25f9" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "registration_activity_logs" ADD CONSTRAINT "FK_94889f9012f93a2a5cfd5e1c625" FOREIGN KEY ("registrationId") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "registration_activity_logs" ADD CONSTRAINT "FK_a4a7fc99b4750a9e422d8670ea2" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "registration_activity_logs" ADD CONSTRAINT "FK_d3f2934712d5f4eb4bac7f1f13f" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "registration_activity_logs" ADD CONSTRAINT "FK_46fbd2e6b73f095c6c9e2ef9b6e" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "otp_verifications" ADD CONSTRAINT "FK_fec02639ae24944c2122230ae4c" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "otp_verifications" ADD CONSTRAINT "FK_e601a887eb92f157c1e882ab707" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "otp_verifications" ADD CONSTRAINT "FK_257ea9c62ed4ca91de20fe21195" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_e36d23e1e7cf81ea77758bef795" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_f21950835fdbd146d6fbd8c7313" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_893573d9f4553d10f80706705c9" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_893573d9f4553d10f80706705c9"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_f21950835fdbd146d6fbd8c7313"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_e36d23e1e7cf81ea77758bef795"`);
        await queryRunner.query(`ALTER TABLE "otp_verifications" DROP CONSTRAINT "FK_257ea9c62ed4ca91de20fe21195"`);
        await queryRunner.query(`ALTER TABLE "otp_verifications" DROP CONSTRAINT "FK_e601a887eb92f157c1e882ab707"`);
        await queryRunner.query(`ALTER TABLE "otp_verifications" DROP CONSTRAINT "FK_fec02639ae24944c2122230ae4c"`);
        await queryRunner.query(`ALTER TABLE "registration_activity_logs" DROP CONSTRAINT "FK_46fbd2e6b73f095c6c9e2ef9b6e"`);
        await queryRunner.query(`ALTER TABLE "registration_activity_logs" DROP CONSTRAINT "FK_d3f2934712d5f4eb4bac7f1f13f"`);
        await queryRunner.query(`ALTER TABLE "registration_activity_logs" DROP CONSTRAINT "FK_a4a7fc99b4750a9e422d8670ea2"`);
        await queryRunner.query(`ALTER TABLE "registration_activity_logs" DROP CONSTRAINT "FK_94889f9012f93a2a5cfd5e1c625"`);
        await queryRunner.query(`ALTER TABLE "registration_field_values" DROP CONSTRAINT "FK_57abcb300b3b1897a41b39f25f9"`);
        await queryRunner.query(`ALTER TABLE "registration_field_values" DROP CONSTRAINT "FK_c7fc5cbb55b1b4c97d31a974b7f"`);
        await queryRunner.query(`ALTER TABLE "registration_field_values" DROP CONSTRAINT "FK_01100e190bbf659018271d4f472"`);
        await queryRunner.query(`ALTER TABLE "registration_field_values" DROP CONSTRAINT "FK_15ebc1a99932aa1a9c3c1d2b9a7"`);
        await queryRunner.query(`ALTER TABLE "custom_fields" DROP CONSTRAINT "FK_c110f6eb57e7ea7b9fd62332324"`);
        await queryRunner.query(`ALTER TABLE "custom_fields" DROP CONSTRAINT "FK_3d5a5d59ca7fd5b965e129b127f"`);
        await queryRunner.query(`ALTER TABLE "registrations" DROP CONSTRAINT "FK_1be84060b881dcf77ef00e9b557"`);
        await queryRunner.query(`ALTER TABLE "registrations" DROP CONSTRAINT "FK_d25742f5db193288c208918489a"`);
        await queryRunner.query(`ALTER TABLE "registrations" DROP CONSTRAINT "FK_82d7f24c99a66acb967e7b13933"`);
        await queryRunner.query(`ALTER TABLE "registrations" DROP CONSTRAINT "FK_0c30fadec0cb9ac9e569a5bd697"`);
        await queryRunner.query(`ALTER TABLE "registrations" DROP CONSTRAINT "FK_b00010b17b38f2e751b9778f369"`);
        await queryRunner.query(`ALTER TABLE "registrations" DROP CONSTRAINT "FK_b1d9b1fa775b09cc2284623646a"`);
        await queryRunner.query(`ALTER TABLE "registrations" DROP CONSTRAINT "FK_7e5ae7aa55bb98b8b9dcbe32ca3"`);
        await queryRunner.query(`ALTER TABLE "qr_templates" DROP CONSTRAINT "FK_a0fd7d4d0653640ed0d3a4bab47"`);
        await queryRunner.query(`ALTER TABLE "qr_templates" DROP CONSTRAINT "FK_96889215363459a0af2b0c8ef98"`);
        await queryRunner.query(`ALTER TABLE "badge_templates" DROP CONSTRAINT "FK_9e890787179c66e34a6eb67284a"`);
        await queryRunner.query(`ALTER TABLE "badge_templates" DROP CONSTRAINT "FK_8740c20ead7348a30a7c51ade9c"`);
        await queryRunner.query(`ALTER TABLE "user_nda_acceptances" DROP CONSTRAINT "FK_8ec901a14048b5ea7f4f75646ac"`);
        await queryRunner.query(`ALTER TABLE "user_nda_acceptances" DROP CONSTRAINT "FK_98ceeefa643578d5aa9a3b9ed74"`);
        await queryRunner.query(`ALTER TABLE "user_nda_acceptances" DROP CONSTRAINT "FK_150d6175232c69ad031e2362e84"`);
        await queryRunner.query(`ALTER TABLE "user_nda_acceptances" DROP CONSTRAINT "FK_edfb5e780889320c4db85df235f"`);
        await queryRunner.query(`ALTER TABLE "nda_templates" DROP CONSTRAINT "FK_167b8d40c4a02de129dfb285156"`);
        await queryRunner.query(`ALTER TABLE "nda_templates" DROP CONSTRAINT "FK_f57849f579d9ed6d934e1e48073"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_52e97c477859f8019f3705abd21"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_51d635f1d983d505fb5a2f44c52"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP TYPE "public"."audit_logs_action_enum"`);
        await queryRunner.query(`DROP TABLE "otp_verifications"`);
        await queryRunner.query(`DROP TYPE "public"."otp_verifications_channel_enum"`);
        await queryRunner.query(`DROP TABLE "registration_activity_logs"`);
        await queryRunner.query(`DROP TYPE "public"."registration_activity_logs_activitytype_enum"`);
        await queryRunner.query(`DROP TABLE "registration_field_values"`);
        await queryRunner.query(`DROP TABLE "custom_fields"`);
        await queryRunner.query(`DROP TYPE "public"."custom_fields_inputtype_enum"`);
        await queryRunner.query(`DROP TABLE "registrations"`);
        await queryRunner.query(`DROP TYPE "public"."registrations_status_enum"`);
        await queryRunner.query(`DROP TABLE "qr_templates"`);
        await queryRunner.query(`DROP TABLE "badge_templates"`);
        await queryRunner.query(`DROP TABLE "user_nda_acceptances"`);
        await queryRunner.query(`DROP TABLE "nda_templates"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_stafftype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAgencyAccounts1790294400000 implements MigrationInterface {
    name = 'AddAgencyAccounts1790294400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "advertisers" ADD COLUMN IF NOT EXISTS "type" character varying(20) NOT NULL DEFAULT 'advertiser'`);
        await queryRunner.query(`ALTER TABLE "advertisers" ADD COLUMN IF NOT EXISTS "agency_id" uuid NULL`);
        await queryRunner.query(`ALTER TABLE "advertisers" ADD CONSTRAINT "FK_advertisers_agency" FOREIGN KEY ("agency_id") REFERENCES "advertisers"("id") ON DELETE RESTRICT`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_advertisers_agency_id" ON "advertisers" ("agency_id")`);
        await queryRunner.query(`ALTER TABLE "advertisers" ADD CONSTRAINT "CHK_advertisers_type" CHECK ("type" IN ('agency', 'advertiser'))`);
        await queryRunner.query(`ALTER TABLE "advertisers" ADD CONSTRAINT "CHK_advertisers_agency_has_no_agency" CHECK (NOT ("type" = 'agency' AND "agency_id" IS NOT NULL))`);
        await queryRunner.query(`ALTER TABLE "advertisers" ALTER COLUMN "email" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "advertisers" ALTER COLUMN "password" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "advertisers" ADD CONSTRAINT "CHK_advertisers_login_credentials" CHECK ("agency_id" IS NOT NULL OR ("email" IS NOT NULL AND "password" IS NOT NULL))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "advertisers" DROP CONSTRAINT IF EXISTS "CHK_advertisers_login_credentials"`);
        await queryRunner.query(`DELETE FROM "advertisers" WHERE "agency_id" IS NOT NULL`);
        await queryRunner.query(`ALTER TABLE "advertisers" ALTER COLUMN "password" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "advertisers" ALTER COLUMN "email" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "advertisers" DROP CONSTRAINT IF EXISTS "CHK_advertisers_agency_has_no_agency"`);
        await queryRunner.query(`ALTER TABLE "advertisers" DROP CONSTRAINT IF EXISTS "CHK_advertisers_type"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_advertisers_agency_id"`);
        await queryRunner.query(`ALTER TABLE "advertisers" DROP CONSTRAINT IF EXISTS "FK_advertisers_agency"`);
        await queryRunner.query(`ALTER TABLE "advertisers" DROP COLUMN IF EXISTS "agency_id"`);
        await queryRunner.query(`ALTER TABLE "advertisers" DROP COLUMN IF EXISTS "type"`);
    }

}

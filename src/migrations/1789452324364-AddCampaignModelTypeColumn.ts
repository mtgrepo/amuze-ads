import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCampaignModelTypeColumn1789452324364 implements MigrationInterface {
    name = 'AddCampaignModelTypeColumn1789452324364'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "model_type" character varying(50) NOT NULL DEFAULT 'display_ads'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaigns" DROP COLUMN IF EXISTS "model_type"`);
    }

}

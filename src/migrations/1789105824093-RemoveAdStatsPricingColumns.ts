import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveAdStatsPricingColumns1789105824093 implements MigrationInterface {
    name = 'RemoveAdStatsPricingColumns1789105824093'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "advertiser_ad_stats" DROP COLUMN "spent"`);
        await queryRunner.query(`ALTER TABLE "advertiser_ad_stats" DROP COLUMN "pricing_mode"`);
        await queryRunner.query(`ALTER TABLE "advertiser_ad_stats" DROP COLUMN "max_impressions"`);
        await queryRunner.query(`ALTER TABLE "advertiser_ad_stats" DROP COLUMN "max_clicks"`);
        await queryRunner.query(`ALTER TABLE "advertiser_ad_stats" DROP COLUMN "max_engagements"`);
        await queryRunner.query(`ALTER TABLE "advertiser_ad_stats" DROP COLUMN "daily_budget"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "advertiser_ad_stats" ADD "daily_budget" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "advertiser_ad_stats" ADD "max_engagements" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "advertiser_ad_stats" ADD "max_clicks" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "advertiser_ad_stats" ADD "max_impressions" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "advertiser_ad_stats" ADD "pricing_mode" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "advertiser_ad_stats" ADD "spent" integer NOT NULL`);
    }

}

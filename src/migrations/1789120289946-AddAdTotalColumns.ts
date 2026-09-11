import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAdTotalColumns1789120289946 implements MigrationInterface {
    name = 'AddAdTotalColumns1789120289946'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ads" ADD "total_impressions" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "ads" ADD "total_clicks" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "ads" ADD "total_engagements" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "ads" ADD "total_watches" integer NOT NULL DEFAULT '0'`);

        await queryRunner.query(`
            UPDATE "ads" a
            SET
                "total_impressions" = COALESCE(s.total_impressions, 0),
                "total_clicks" = COALESCE(s.total_clicks, 0),
                "total_engagements" = COALESCE(s.total_engagements, 0),
                "total_watches" = COALESCE(s.total_watches, 0)
            FROM (
                SELECT
                    ad_id,
                    SUM(impressions) AS total_impressions,
                    SUM(clicks) AS total_clicks,
                    SUM(engagements) AS total_engagements,
                    SUM(watches) AS total_watches
                FROM "advertiser_ad_stats"
                GROUP BY ad_id
            ) s
            WHERE a.id = s.ad_id
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ads" DROP COLUMN "total_watches"`);
        await queryRunner.query(`ALTER TABLE "ads" DROP COLUMN "total_engagements"`);
        await queryRunner.query(`ALTER TABLE "ads" DROP COLUMN "total_clicks"`);
        await queryRunner.query(`ALTER TABLE "ads" DROP COLUMN "total_impressions"`);
    }

}

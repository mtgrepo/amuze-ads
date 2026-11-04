import { MigrationInterface, QueryRunner } from "typeorm";

export class PerformanceMetrics1793762749330 implements MigrationInterface {
    name = 'PerformanceMetrics1793762749330'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Engagements are now clicks + watches, worked out; completions are a new count, so they start at zero.
        await queryRunner.query(`ALTER TABLE "advertiser_ad_stats" DROP COLUMN "engagements"`);
        await queryRunner.query(`ALTER TABLE "advertiser_ad_stats" ADD "completions" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "ads" DROP COLUMN "total_engagements"`);
        await queryRunner.query(`ALTER TABLE "ads" ADD "total_completions" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`CREATE TABLE "ad_daily_viewers" ("ad_id" uuid NOT NULL, "stat_date" date NOT NULL, "user_id" character varying(100) NOT NULL, CONSTRAINT "PK_afcaba1fb4b9100384a4900b949" PRIMARY KEY ("ad_id", "stat_date", "user_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8d9e972dbcd424daf31953f174" ON "ad_daily_viewers" ("stat_date") `);
        await queryRunner.query(`ALTER TABLE "ad_daily_viewers" ADD CONSTRAINT "FK_ba2637bc9e1b4ea116122a6f025" FOREIGN KEY ("ad_id") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ad_daily_viewers" DROP CONSTRAINT "FK_ba2637bc9e1b4ea116122a6f025"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8d9e972dbcd424daf31953f174"`);
        await queryRunner.query(`DROP TABLE "ad_daily_viewers"`);
        await queryRunner.query(`ALTER TABLE "ads" DROP COLUMN "total_completions"`);
        await queryRunner.query(`ALTER TABLE "ads" ADD "total_engagements" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "advertiser_ad_stats" DROP COLUMN "completions"`);
        await queryRunner.query(`ALTER TABLE "advertiser_ad_stats" ADD "engagements" integer NOT NULL DEFAULT '0'`);
    }

}

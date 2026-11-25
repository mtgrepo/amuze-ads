import { MigrationInterface, QueryRunner } from "typeorm";

export class AudienceDemographics1794802510418 implements MigrationInterface {
    name = 'AudienceDemographics1794802510418'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "ad_daily_demographics" ("ad_id" uuid NOT NULL, "stat_date" date NOT NULL, "age" smallint NOT NULL, "gender" character varying(10) NOT NULL, "impressions" integer NOT NULL DEFAULT '0', "clicks" integer NOT NULL DEFAULT '0', "watches" integer NOT NULL DEFAULT '0', "completions" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_b80a6e1a4770a8800dc0ca0cfea" PRIMARY KEY ("ad_id", "stat_date", "age", "gender"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a928e05e2aced9bb0e74eccbbb" ON "ad_daily_demographics" ("stat_date") `);
        await queryRunner.query(`ALTER TABLE "ad_daily_demographics" ADD CONSTRAINT "FK_29af54d2daec961436111efe816" FOREIGN KEY ("ad_id") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ad_daily_demographics" DROP CONSTRAINT "FK_29af54d2daec961436111efe816"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a928e05e2aced9bb0e74eccbbb"`);
        await queryRunner.query(`DROP TABLE "ad_daily_demographics"`);
    }

}

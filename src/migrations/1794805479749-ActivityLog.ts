import { MigrationInterface, QueryRunner } from "typeorm";

export class ActivityLog1794805479749 implements MigrationInterface {
    name = 'ActivityLog1794805479749'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "activity_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "actor_type" character varying(20) NOT NULL, "actor_id" character varying(64), "actor_name" character varying(150), "action" character varying(60) NOT NULL, "entity_type" character varying(30) NOT NULL, "entity_id" character varying(64) NOT NULL, "campaign_id" uuid, "advertiser_id" uuid, "summary" character varying(300) NOT NULL, "changes" jsonb, "meta" jsonb, CONSTRAINT "PK_067d761e2956b77b14e534fd6f1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a9aa535a31227ef336222d28e1" ON "activity_log" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_b625b6f047e304cce2ed231f01" ON "activity_log" ("entity_type", "entity_id", "created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_7c7adc36ce44467f9e1d574767" ON "activity_log" ("advertiser_id", "created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_2c59291fdb559586ee35fbe73a" ON "activity_log" ("campaign_id", "created_at") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_2c59291fdb559586ee35fbe73a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7c7adc36ce44467f9e1d574767"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b625b6f047e304cce2ed231f01"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a9aa535a31227ef336222d28e1"`);
        await queryRunner.query(`DROP TABLE "activity_log"`);
    }

}

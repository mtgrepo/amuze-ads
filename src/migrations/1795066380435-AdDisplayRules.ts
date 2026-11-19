import { MigrationInterface, QueryRunner } from "typeorm";

export class AdDisplayRules1795066380435 implements MigrationInterface {
    name = 'AdDisplayRules1795066380435'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "ad_display_rules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ad_type" character varying(50) NOT NULL, "placement_key" character varying(50) NOT NULL, "enabled" boolean NOT NULL DEFAULT true, "every_min" integer, "every_max" integer, "cooldown_minutes" integer, "video_position" character varying(10), "modules" jsonb, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_80a02215754e3d5cf2a5fbbf3b6" UNIQUE ("ad_type", "placement_key"), CONSTRAINT "PK_b9e3a8089906bd1a3a4acf3010d" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "ad_display_rules"`);
    }

}

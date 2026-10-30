import { MigrationInterface, QueryRunner } from "typeorm";

export class PackagesAndObjectives1793331845964 implements MigrationInterface {
    name = 'PackagesAndObjectives1793331845964'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "ad_packages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "duration_days" integer NOT NULL, "price" integer NOT NULL, "description" text, "is_active" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_a44b8134389b6315a43b710c172" UNIQUE ("name"), CONSTRAINT "PK_83f845520e0b1e582374d435781" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "campaign_objectives" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "campaign_id" uuid NOT NULL, "objective_type" character varying(20) NOT NULL, "target_count" integer NOT NULL, "price" integer NOT NULL, "price_per" integer NOT NULL, "cost" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_dbece34819c42ab9e18ceb7d82b" UNIQUE ("campaign_id", "objective_type"), CONSTRAINT "PK_b63bb20e17b4c32ae7b0387ed00" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "campaigns" DROP COLUMN "daily_budget"`);
        await queryRunner.query(`ALTER TABLE "campaigns" DROP COLUMN "budget_plan"`);
        await queryRunner.query(`ALTER TABLE "campaigns" ADD "package_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaigns" ADD "package_name" character varying(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaigns" ADD "package_days" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaigns" ADD "package_price" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaigns" ADD "package_quantity" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaigns" ADD "plan_cost" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaigns" ADD "objective_cost" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "campaign_extensions" ADD "quantity" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaign_objectives" ADD CONSTRAINT "FK_c517b3b3c869bf2d7277f323c24" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "campaigns" ADD CONSTRAINT "FK_76675f84e823e0efe6b9422f66d" FOREIGN KEY ("package_id") REFERENCES "ad_packages"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaigns" DROP CONSTRAINT "FK_76675f84e823e0efe6b9422f66d"`);
        await queryRunner.query(`ALTER TABLE "campaign_objectives" DROP CONSTRAINT "FK_c517b3b3c869bf2d7277f323c24"`);
        await queryRunner.query(`ALTER TABLE "campaign_extensions" DROP COLUMN "quantity"`);
        await queryRunner.query(`ALTER TABLE "campaigns" DROP COLUMN "objective_cost"`);
        await queryRunner.query(`ALTER TABLE "campaigns" DROP COLUMN "plan_cost"`);
        await queryRunner.query(`ALTER TABLE "campaigns" DROP COLUMN "package_quantity"`);
        await queryRunner.query(`ALTER TABLE "campaigns" DROP COLUMN "package_price"`);
        await queryRunner.query(`ALTER TABLE "campaigns" DROP COLUMN "package_days"`);
        await queryRunner.query(`ALTER TABLE "campaigns" DROP COLUMN "package_name"`);
        await queryRunner.query(`ALTER TABLE "campaigns" DROP COLUMN "package_id"`);
        await queryRunner.query(`ALTER TABLE "campaigns" ADD "budget_plan" character varying(20) NOT NULL DEFAULT 'daily'`);
        await queryRunner.query(`ALTER TABLE "campaigns" ADD "daily_budget" integer NOT NULL`);
        await queryRunner.query(`DROP TABLE "campaign_objectives"`);
        await queryRunner.query(`DROP TABLE "ad_packages"`);
    }

}

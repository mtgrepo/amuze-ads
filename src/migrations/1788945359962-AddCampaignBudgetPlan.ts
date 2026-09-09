import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCampaignBudgetPlan1788945359962 implements MigrationInterface {
    name = 'AddCampaignBudgetPlan1788945359962'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaigns" ADD "budget_plan" character varying(20) NOT NULL DEFAULT 'daily'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaigns" DROP COLUMN "budget_plan"`);
    }

}

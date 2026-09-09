import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveCampaignObjective1788940092792 implements MigrationInterface {
    name = 'RemoveCampaignObjective1788940092792'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaigns" DROP COLUMN "objective"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaigns" ADD "objective" character varying(255) NOT NULL`);
    }

}

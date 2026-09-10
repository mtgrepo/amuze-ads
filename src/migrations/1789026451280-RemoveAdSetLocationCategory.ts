import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveAdSetLocationCategory1789026451280 implements MigrationInterface {
    name = 'RemoveAdSetLocationCategory1789026451280'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ad_sets" DROP COLUMN "location"`);
        await queryRunner.query(`ALTER TABLE "ad_sets" DROP COLUMN "category"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ad_sets" ADD "category" character varying(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ad_sets" ADD "location" text NOT NULL`);
    }

}

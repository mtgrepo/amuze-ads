import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWatchesColumn1789111664220 implements MigrationInterface {
    name = 'AddWatchesColumn1789111664220'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "advertiser_ad_stats" ADD "watches" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "advertiser_ad_stats" DROP COLUMN "watches"`);
    }

}

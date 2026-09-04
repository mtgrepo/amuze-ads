import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCampaignModelType1788512246672 implements MigrationInterface {
    name = 'AddCampaignModelType1788512246672'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ads" DROP COLUMN "ad_type"`);
        await queryRunner.query(`ALTER TABLE "ads" DROP COLUMN "placement_key"`);
        await queryRunner.query(`ALTER TABLE "campaigns" DROP COLUMN "target_type"`);
        await queryRunner.query(`ALTER TABLE "campaigns" DROP COLUMN "target_id"`);
        await queryRunner.query(`ALTER TABLE "ads" DROP CONSTRAINT "FK_6a5671a83d8202c58be7d6516fd"`);
        await queryRunner.query(`ALTER TABLE "ads" ALTER COLUMN "ad_set_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ads" ADD CONSTRAINT "FK_6a5671a83d8202c58be7d6516fd" FOREIGN KEY ("ad_set_id") REFERENCES "ad_sets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ads" DROP CONSTRAINT "FK_6a5671a83d8202c58be7d6516fd"`);
        await queryRunner.query(`ALTER TABLE "ads" ALTER COLUMN "ad_set_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ads" ADD CONSTRAINT "FK_6a5671a83d8202c58be7d6516fd" FOREIGN KEY ("ad_set_id") REFERENCES "ad_sets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "campaigns" ADD "target_id" uuid`);
        await queryRunner.query(`ALTER TABLE "campaigns" ADD "target_type" character varying(50)`);
        await queryRunner.query(`ALTER TABLE "ads" ADD "placement_key" character varying(50)`);
        await queryRunner.query(`ALTER TABLE "ads" ADD "ad_type" character varying(50)`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAdTypeAndPlacement1788749071242 implements MigrationInterface {
    name = 'AddAdTypeAndPlacement1788749071242'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ads" ADD "ad_type" character varying(50) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ads" ADD "placement_key" character varying(50) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ads" ADD "ad_creative_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ads" DROP CONSTRAINT "FK_6a5671a83d8202c58be7d6516fd"`);
        await queryRunner.query(`ALTER TABLE "ads" ADD CONSTRAINT "UQ_6a5671a83d8202c58be7d6516fd" UNIQUE ("ad_set_id")`);
        await queryRunner.query(`ALTER TABLE "ad_sets" DROP CONSTRAINT "FK_da62bc088aa0c99505b9bddbcc9"`);
        await queryRunner.query(`ALTER TABLE "ad_sets" ADD CONSTRAINT "UQ_da62bc088aa0c99505b9bddbcc9" UNIQUE ("campaign_id")`);
        await queryRunner.query(`ALTER TABLE "ads" ADD CONSTRAINT "FK_6a5671a83d8202c58be7d6516fd" FOREIGN KEY ("ad_set_id") REFERENCES "ad_sets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ads" ADD CONSTRAINT "FK_36f2426d6134bb83be6d57accf6" FOREIGN KEY ("ad_creative_id") REFERENCES "ad_creatives"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ad_sets" ADD CONSTRAINT "FK_da62bc088aa0c99505b9bddbcc9" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ad_sets" DROP CONSTRAINT "FK_da62bc088aa0c99505b9bddbcc9"`);
        await queryRunner.query(`ALTER TABLE "ads" DROP CONSTRAINT "FK_36f2426d6134bb83be6d57accf6"`);
        await queryRunner.query(`ALTER TABLE "ads" DROP CONSTRAINT "FK_6a5671a83d8202c58be7d6516fd"`);
        await queryRunner.query(`ALTER TABLE "ad_sets" DROP CONSTRAINT "UQ_da62bc088aa0c99505b9bddbcc9"`);
        await queryRunner.query(`ALTER TABLE "ad_sets" ADD CONSTRAINT "FK_da62bc088aa0c99505b9bddbcc9" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ads" DROP CONSTRAINT "UQ_6a5671a83d8202c58be7d6516fd"`);
        await queryRunner.query(`ALTER TABLE "ads" ADD CONSTRAINT "FK_6a5671a83d8202c58be7d6516fd" FOREIGN KEY ("ad_set_id") REFERENCES "ad_sets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ads" DROP COLUMN "ad_creative_id"`);
        await queryRunner.query(`ALTER TABLE "ads" DROP COLUMN "placement_key"`);
        await queryRunner.query(`ALTER TABLE "ads" DROP COLUMN "ad_type"`);
    }

}

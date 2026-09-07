import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeCampaignPostIdNullable1788754523339 implements MigrationInterface {
    name = 'MakeCampaignPostIdNullable1788754523339'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaigns" DROP CONSTRAINT "FK_171ace9214984b289d29b9abf58"`);
        await queryRunner.query(`ALTER TABLE "campaigns" ALTER COLUMN "post_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaigns" ADD CONSTRAINT "FK_171ace9214984b289d29b9abf58" FOREIGN KEY ("post_id") REFERENCES "advertiser_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaigns" DROP CONSTRAINT "FK_171ace9214984b289d29b9abf58"`);
        await queryRunner.query(`ALTER TABLE "campaigns" ALTER COLUMN "post_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaigns" ADD CONSTRAINT "FK_171ace9214984b289d29b9abf58" FOREIGN KEY ("post_id") REFERENCES "advertiser_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveAdvertiserPosts1789028671712 implements MigrationInterface {
    name = 'RemoveAdvertiserPosts1789028671712'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaigns" DROP CONSTRAINT "FK_171ace9214984b289d29b9abf58"`);
        await queryRunner.query(`ALTER TABLE "campaigns" DROP COLUMN "post_id"`);
        await queryRunner.query(`ALTER TABLE "advertiser_posts" DROP CONSTRAINT "FK_63bcdf0b3c9ca354793f17d10e0"`);
        await queryRunner.query(`DROP TABLE "advertiser_posts"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "advertiser_posts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "advertiser_id" uuid NOT NULL, "title" character varying(255) NOT NULL, "description" text NOT NULL, "photo" character varying(500) NOT NULL, "status" character varying(100) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2b1a2b6690543896335681c6cce" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "advertiser_posts" ADD CONSTRAINT "FK_63bcdf0b3c9ca354793f17d10e0" FOREIGN KEY ("advertiser_id") REFERENCES "advertisers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "campaigns" ADD "post_id" uuid`);
        await queryRunner.query(`ALTER TABLE "campaigns" ADD CONSTRAINT "FK_171ace9214984b289d29b9abf58" FOREIGN KEY ("post_id") REFERENCES "advertiser_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}

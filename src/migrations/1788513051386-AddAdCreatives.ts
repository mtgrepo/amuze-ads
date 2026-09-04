import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAdCreatives1788513051386 implements MigrationInterface {
    name = 'AddAdCreatives1788513051386'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "ad_creatives" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "advertiser_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "asset_type" character varying(20) NOT NULL, "asset" character varying(500) NOT NULL, "destination_link" character varying(500) NOT NULL, "status" character varying(100) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c5b210ffdc5003abe06a902a927" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "ad_creatives" ADD CONSTRAINT "FK_cadaba9ca7b6e4b878f9b71ac5e" FOREIGN KEY ("advertiser_id") REFERENCES "advertisers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ad_creatives" DROP CONSTRAINT "FK_cadaba9ca7b6e4b878f9b71ac5e"`);
        await queryRunner.query(`DROP TABLE "ad_creatives"`);
    }

}

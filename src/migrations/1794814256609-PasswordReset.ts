import { MigrationInterface, QueryRunner } from "typeorm";

export class PasswordReset1794814256609 implements MigrationInterface {
    name = 'PasswordReset1794814256609'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "password_reset_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "advertiser_id" uuid NOT NULL, "token_hash" character varying(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "used_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d16bebd73e844c48bca50ff8d3d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_91185d86d5d7557b19abbb2868" ON "password_reset_tokens" ("token_hash") `);
        await queryRunner.query(`CREATE INDEX "IDX_3074502500f6f07cd82bfe9724" ON "password_reset_tokens" ("advertiser_id", "created_at") `);
        await queryRunner.query(`ALTER TABLE "advertisers" ADD "password_changed_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "FK_502374d29ea2a25b0abd891cb45" FOREIGN KEY ("advertiser_id") REFERENCES "advertisers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "FK_502374d29ea2a25b0abd891cb45"`);
        await queryRunner.query(`ALTER TABLE "advertisers" DROP COLUMN "password_changed_at"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3074502500f6f07cd82bfe9724"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_91185d86d5d7557b19abbb2868"`);
        await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
    }

}

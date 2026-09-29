import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPointsWallet1790655768445 implements MigrationInterface {
    name = 'AddPointsWallet1790655768445'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "point_ledger" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "advertiser_id" uuid NOT NULL, "type" character varying(20) NOT NULL, "amount" integer NOT NULL, "balance_after" integer NOT NULL, "reference_type" character varying(50), "reference_id" character varying(255), "note" text, "created_by_admin_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "CHK_point_ledger_type" CHECK ("type" IN ('purchase', 'admin_paid', 'admin_bonus', 'spend', 'refund')), CONSTRAINT "PK_d6b8fc449335a8d010aa8da923c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_point_ledger_reference" ON "point_ledger" ("reference_type", "reference_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_point_ledger_advertiser" ON "point_ledger" ("advertiser_id", "created_at") `);
        await queryRunner.query(`ALTER TABLE "advertisers" ADD "points_balance" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "advertisers" ADD CONSTRAINT "CHK_advertisers_points_balance" CHECK ("points_balance" >= 0)`);
        await queryRunner.query(`ALTER TABLE "point_ledger" ADD CONSTRAINT "FK_point_ledger_advertiser" FOREIGN KEY ("advertiser_id") REFERENCES "advertisers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "point_ledger" DROP CONSTRAINT "FK_point_ledger_advertiser"`);
        await queryRunner.query(`ALTER TABLE "advertisers" DROP CONSTRAINT "CHK_advertisers_points_balance"`);
        await queryRunner.query(`ALTER TABLE "advertisers" DROP COLUMN "points_balance"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_point_ledger_advertiser"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_point_ledger_reference"`);
        await queryRunner.query(`DROP TABLE "point_ledger"`);
    }

}

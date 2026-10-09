import { MigrationInterface, QueryRunner } from "typeorm";

export class CampaignExtensions1791515571185 implements MigrationInterface {
    name = 'CampaignExtensions1791515571185'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "campaign_extensions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "campaign_id" uuid NOT NULL, "start_date" date NOT NULL, "previous_end_date" date NOT NULL, "new_end_date" date NOT NULL, "days" integer NOT NULL, "amount" integer NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending', "requested_by_id" uuid NOT NULL, "requested_by_role" character varying(20) NOT NULL, "reviewed_by_admin_id" uuid, "reviewed_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4266e8d71280d841868b7286a41" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "campaign_extensions" ADD CONSTRAINT "FK_6202b6924fd655f5224b3af5749" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaign_extensions" DROP CONSTRAINT "FK_6202b6924fd655f5224b3af5749"`);
        await queryRunner.query(`DROP TABLE "campaign_extensions"`);
    }

}

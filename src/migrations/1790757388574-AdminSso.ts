import { MigrationInterface, QueryRunner } from "typeorm";

export class AdminSso1790757388574 implements MigrationInterface {
    name = 'AdminSso1790757388574'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin-users" DROP COLUMN "password"`);
        await queryRunner.query(`ALTER TABLE "admin-users" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "admin-users" ADD "amuze_user_id" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "admin-users" ADD CONSTRAINT "UQ_eb4be30f7e179cdc0a8227d34f9" UNIQUE ("amuze_user_id")`);
        await queryRunner.query(`ALTER TABLE "admin-users" ADD "phone" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "admin-users" ADD "is_active" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "admin-users" ADD "last_login" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "admin-users" ALTER COLUMN "email" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin-users" ALTER COLUMN "email" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "admin-users" DROP COLUMN "last_login"`);
        await queryRunner.query(`ALTER TABLE "admin-users" DROP COLUMN "is_active"`);
        await queryRunner.query(`ALTER TABLE "admin-users" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "admin-users" DROP CONSTRAINT "UQ_eb4be30f7e179cdc0a8227d34f9"`);
        await queryRunner.query(`ALTER TABLE "admin-users" DROP COLUMN "amuze_user_id"`);
        await queryRunner.query(`ALTER TABLE "admin-users" ADD "isActive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "admin-users" ADD "password" text NOT NULL`);
    }

}

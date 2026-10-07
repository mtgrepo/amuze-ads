import { MigrationInterface, QueryRunner } from "typeorm";

export class OptionalProfileLogoAndWebsite1791342932245 implements MigrationInterface {
    name = 'OptionalProfileLogoAndWebsite1791342932245'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "advertiser_profiles" ALTER COLUMN "photo" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "advertiser_profiles" ALTER COLUMN "website" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "advertiser_profiles" ALTER COLUMN "website" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "advertiser_profiles" ALTER COLUMN "photo" SET NOT NULL`);
    }

}

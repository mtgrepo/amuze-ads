import { MigrationInterface, QueryRunner } from "typeorm";

export class OptionalDicaNumber1791435077104 implements MigrationInterface {
    name = 'OptionalDicaNumber1791435077104'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "advertiser_profiles" ALTER COLUMN "dica_number" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "advertiser_profiles" ALTER COLUMN "dica_number" SET NOT NULL`);
    }

}

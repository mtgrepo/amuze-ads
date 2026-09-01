import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1788168519202 implements MigrationInterface {
    name = 'InitialSchema1788168519202'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "advertiser_profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "advertiser_id" uuid NOT NULL, "business_name" character varying(255) NOT NULL, "business_no" character varying(255) NOT NULL, "business_type" character varying(500) NOT NULL, "dica_number" character varying(255) NOT NULL, "photo" character varying(500) NOT NULL, "website" character varying(500) NOT NULL, "address" text NOT NULL, "country" character varying(255) NOT NULL, "timezone" character varying(255) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_305681862dd1bbc7be9852fe522" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "advertiserId" uuid NOT NULL, "title" character varying(255) NOT NULL, "message" text NOT NULL, "read" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "advertiser_ad_stats" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ad_id" uuid NOT NULL, "stat_date" date NOT NULL, "impressions" integer NOT NULL, "clicks" integer NOT NULL, "spent" integer NOT NULL, "pricing_mode" character varying(20), "max_impressions" integer NOT NULL DEFAULT '0', "max_clicks" integer NOT NULL DEFAULT '0', "max_engagements" integer NOT NULL DEFAULT '0', "engagements" integer NOT NULL DEFAULT '0', "daily_budget" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_c2919eec8f2274d1e33ba300555" UNIQUE ("ad_id", "stat_date"), CONSTRAINT "PK_cbaa9848f7b0809c460251ed205" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "ads" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" character varying(255) NOT NULL, "ad_type" character varying(50), "placement_key" character varying(50), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "ad_set_id" uuid, CONSTRAINT "PK_a7af7d1998037a97076f758fc23" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "ad_sets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "age_min" integer NOT NULL, "age_max" integer NOT NULL, "gender" character varying(255) NOT NULL, "location" text NOT NULL, "category" character varying(255) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "campaign_id" uuid NOT NULL, CONSTRAINT "PK_94c878d0598e5927e7043a26569" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "campaigns" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "objective" character varying(255) NOT NULL, "daily_budget" integer NOT NULL, "total_budget" integer NOT NULL, "spent_amount" integer NOT NULL DEFAULT '0', "start_date" date NOT NULL, "end_date" date NOT NULL, "status" character varying(255) NOT NULL, "model_type" character varying(50) NOT NULL DEFAULT 'display_ads', "target_type" character varying(50), "target_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "advertiser_id" uuid NOT NULL, "post_id" uuid NOT NULL, CONSTRAINT "PK_831e3fcd4fc45b4e4c3f57a9ee4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "advertiser_posts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "advertiser_id" uuid NOT NULL, "title" character varying(255) NOT NULL, "description" text NOT NULL, "photo" character varying(500) NOT NULL, "status" character varying(100) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2b1a2b6690543896335681c6cce" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "advertisers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "phone" character varying(20), "status" character varying(255) NOT NULL, "verified" boolean NOT NULL DEFAULT true, "password" text NOT NULL, "last_login" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_4ed24539ffeb0089ba9a6304b8d" UNIQUE ("email"), CONSTRAINT "PK_a0618516584bd6609576d6a9ff5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "advertiser_id" uuid NOT NULL, "payment_method" character varying(255) NOT NULL, "amount" integer NOT NULL, "reference_type" character varying(255) NOT NULL, "reference_id" character varying(255) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "system_configs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "category" character varying(100) NOT NULL, "config_key" character varying(100) NOT NULL, "config_value" jsonb NOT NULL, "description" text, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_34c28d7726341045a7f8164ec09" UNIQUE ("category", "config_key"), CONSTRAINT "PK_29ac548e654c799fd885e1b9b71" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "admin-users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "password" text NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_92dec7b7b06f169acbcdff82c63" UNIQUE ("email"), CONSTRAINT "PK_728d23d3b91ad8c7769423a2952" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "advertiser_profiles" ADD CONSTRAINT "FK_c910743104b5d24e082dc57669c" FOREIGN KEY ("advertiser_id") REFERENCES "advertisers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_01f612aa34f761f64ada46f26b9" FOREIGN KEY ("advertiserId") REFERENCES "advertisers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "advertiser_ad_stats" ADD CONSTRAINT "FK_0178cb56220afc0d2ccd76868f5" FOREIGN KEY ("ad_id") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ads" ADD CONSTRAINT "FK_6a5671a83d8202c58be7d6516fd" FOREIGN KEY ("ad_set_id") REFERENCES "ad_sets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ad_sets" ADD CONSTRAINT "FK_da62bc088aa0c99505b9bddbcc9" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "campaigns" ADD CONSTRAINT "FK_b8e009ea9bab0dbbc4435c36ce9" FOREIGN KEY ("advertiser_id") REFERENCES "advertisers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "campaigns" ADD CONSTRAINT "FK_171ace9214984b289d29b9abf58" FOREIGN KEY ("post_id") REFERENCES "advertiser_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "advertiser_posts" ADD CONSTRAINT "FK_63bcdf0b3c9ca354793f17d10e0" FOREIGN KEY ("advertiser_id") REFERENCES "advertisers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_549bb1211f2312e6c223f4b5923" FOREIGN KEY ("advertiser_id") REFERENCES "advertisers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_549bb1211f2312e6c223f4b5923"`);
        await queryRunner.query(`ALTER TABLE "advertiser_posts" DROP CONSTRAINT "FK_63bcdf0b3c9ca354793f17d10e0"`);
        await queryRunner.query(`ALTER TABLE "campaigns" DROP CONSTRAINT "FK_171ace9214984b289d29b9abf58"`);
        await queryRunner.query(`ALTER TABLE "campaigns" DROP CONSTRAINT "FK_b8e009ea9bab0dbbc4435c36ce9"`);
        await queryRunner.query(`ALTER TABLE "ad_sets" DROP CONSTRAINT "FK_da62bc088aa0c99505b9bddbcc9"`);
        await queryRunner.query(`ALTER TABLE "ads" DROP CONSTRAINT "FK_6a5671a83d8202c58be7d6516fd"`);
        await queryRunner.query(`ALTER TABLE "advertiser_ad_stats" DROP CONSTRAINT "FK_0178cb56220afc0d2ccd76868f5"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_01f612aa34f761f64ada46f26b9"`);
        await queryRunner.query(`ALTER TABLE "advertiser_profiles" DROP CONSTRAINT "FK_c910743104b5d24e082dc57669c"`);
        await queryRunner.query(`DROP TABLE "admin-users"`);
        await queryRunner.query(`DROP TABLE "system_configs"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
        await queryRunner.query(`DROP TABLE "advertisers"`);
        await queryRunner.query(`DROP TABLE "advertiser_posts"`);
        await queryRunner.query(`DROP TABLE "campaigns"`);
        await queryRunner.query(`DROP TABLE "ad_sets"`);
        await queryRunner.query(`DROP TABLE "ads"`);
        await queryRunner.query(`DROP TABLE "advertiser_ad_stats"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TABLE "advertiser_profiles"`);
    }

}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateActivityLogTable1759700000000 implements MigrationInterface {
  name = 'CreateActivityLogTable1759700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "activity_log" CASCADE;
    `);

    await queryRunner.query(`
      CREATE TABLE "activity_log" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "entityType" character varying(40) NOT NULL,
        "entityId" character varying(64),
        "memberId" uuid,
        "centerId" uuid,
        "loanId" uuid,
        "action" character varying(60) NOT NULL,
        "description" text,
        "amount" numeric(12,2),
        "payload" jsonb,
        "performedByUserId" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_activity_log_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_activity_entity_created" ON "activity_log" ("entityType", "createdAt");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_activity_member_created" ON "activity_log" ("memberId", "createdAt");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_activity_center_created" ON "activity_log" ("centerId", "createdAt");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_activity_loan_created" ON "activity_log" ("loanId", "createdAt");
    `);

    await queryRunner.query(`
      ALTER TABLE "activity_log"
      ADD CONSTRAINT "FK_activity_member" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE SET NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "activity_log"
      ADD CONSTRAINT "FK_activity_center" FOREIGN KEY ("centerId") REFERENCES "center"("id") ON DELETE SET NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "activity_log"
      ADD CONSTRAINT "FK_activity_loan" FOREIGN KEY ("loanId") REFERENCES "loan"("id") ON DELETE SET NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "activity_log" DROP CONSTRAINT "FK_activity_loan";
    `);
    await queryRunner.query(`
      ALTER TABLE "activity_log" DROP CONSTRAINT "FK_activity_center";
    `);
    await queryRunner.query(`
      ALTER TABLE "activity_log" DROP CONSTRAINT "FK_activity_member";
    `);
    await queryRunner.query(`
      DROP INDEX "IDX_activity_loan_created";
    `);
    await queryRunner.query(`
      DROP INDEX "IDX_activity_center_created";
    `);
    await queryRunner.query(`
      DROP INDEX "IDX_activity_member_created";
    `);
    await queryRunner.query(`
      DROP INDEX "IDX_activity_entity_created";
    `);
    await queryRunner.query(`
      DROP TABLE "activity_log";
    `);
  }
}

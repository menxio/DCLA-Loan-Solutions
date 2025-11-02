import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRepaymentSchedule1759805000000
  implements MigrationInterface
{
  name = 'CreateRepaymentSchedule1759805000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TYPE "public"."loan_repayment_schedule_status_enum" AS ENUM('unpaid', 'partial', 'paid', 'advance')`,
    );
    await queryRunner.query(`
      CREATE TABLE "loan_repayment_schedule" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "loanId" uuid NOT NULL,
        "memberId" uuid,
        "centerId" uuid,
        "dueDate" date NOT NULL,
        "weekNumber" integer NOT NULL,
        "amountDue" numeric(12,2) NOT NULL DEFAULT '0',
        "amountPaid" numeric(12,2) NOT NULL DEFAULT '0',
        "status" "public"."loan_repayment_schedule_status_enum" NOT NULL DEFAULT 'unpaid',
        "advanceApplied" numeric(12,2) NOT NULL DEFAULT '0',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_565b33bf5608efc5def1961b00f" PRIMARY KEY ("id"),
        CONSTRAINT "FK_schedule_loan" FOREIGN KEY ("loanId") REFERENCES "loan"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_schedule_loan_week" ON "loan_repayment_schedule" ("loanId", "weekNumber")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_schedule_loan_due" ON "loan_repayment_schedule" ("loanId", "dueDate")`,
    );
    await queryRunner.query(`
      CREATE TABLE "loan_repayment_allocation" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "repaymentId" uuid NOT NULL,
        "scheduleId" uuid NOT NULL,
        "amountApplied" numeric(12,2) NOT NULL DEFAULT '0',
        "cashPortion" numeric(12,2) NOT NULL DEFAULT '0',
        "savingsPortion" numeric(12,2) NOT NULL DEFAULT '0',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_0761815fd378fbefae76074ef28" PRIMARY KEY ("id"),
        CONSTRAINT "FK_allocation_repayment" FOREIGN KEY ("repaymentId") REFERENCES "repayment"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_allocation_schedule" FOREIGN KEY ("scheduleId") REFERENCES "loan_repayment_schedule"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_allocation_unique" ON "loan_repayment_allocation" ("repaymentId", "scheduleId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_allocation_unique"`,
    );
    await queryRunner.query(
      `DROP TABLE "loan_repayment_allocation"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_schedule_loan_due"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_schedule_loan_week"`,
    );
    await queryRunner.query(
      `DROP TABLE "loan_repayment_schedule"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."loan_repayment_schedule_status_enum"`,
    );
  }
}

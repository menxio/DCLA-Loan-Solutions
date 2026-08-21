import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLoanChargeLedger1763300000000 implements MigrationInterface {
  name = 'AddLoanChargeLedger1763300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "loan" ADD COLUMN IF NOT EXISTS "pastDueInterestPaid" numeric(12,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "loan" ADD COLUMN IF NOT EXISTS "penaltyPaid" numeric(12,2) NOT NULL DEFAULT '0'`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loan_charge_ledger_chargetype_enum') THEN
          CREATE TYPE "loan_charge_ledger_chargetype_enum" AS ENUM ('past_due_interest', 'penalty');
        END IF;
      END$$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loan_charge_ledger_eventtype_enum') THEN
          CREATE TYPE "loan_charge_ledger_eventtype_enum" AS ENUM ('accrual', 'payment', 'payment_reversal');
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "loan_charge_ledger" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "loanId" uuid NOT NULL,
        "scheduleId" uuid,
        "chargeType" "loan_charge_ledger_chargetype_enum" NOT NULL,
        "eventType" "loan_charge_ledger_eventtype_enum" NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "cashPortion" numeric(12,2) NOT NULL DEFAULT '0',
        "savingsPortion" numeric(12,2) NOT NULL DEFAULT '0',
        "baseAmount" numeric(12,2) NOT NULL DEFAULT '0',
        "rate" numeric(8,6) NOT NULL DEFAULT '0',
        "periodStart" date,
        "periodEnd" date,
        "sourceRepaymentId" uuid,
        "reversedLedgerEntryId" uuid,
        "idempotencyKey" text NOT NULL,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_loan_charge_ledger_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_loan_charge_ledger_idempotency_key" UNIQUE ("idempotencyKey")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_loan_charge_ledger_loan_type_event" ON "loan_charge_ledger" ("loanId", "chargeType", "eventType")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_loan_charge_ledger_source_repayment" ON "loan_charge_ledger" ("sourceRepaymentId")`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_loan_charge_ledger_loan'
        ) THEN
          ALTER TABLE "loan_charge_ledger"
          ADD CONSTRAINT "FK_loan_charge_ledger_loan"
          FOREIGN KEY ("loanId") REFERENCES "loan"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END$$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_loan_charge_ledger_schedule'
        ) THEN
          ALTER TABLE "loan_charge_ledger"
          ADD CONSTRAINT "FK_loan_charge_ledger_schedule"
          FOREIGN KEY ("scheduleId") REFERENCES "loan_repayment_schedule"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END$$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_loan_charge_ledger_source_repayment'
        ) THEN
          ALTER TABLE "loan_charge_ledger"
          ADD CONSTRAINT "FK_loan_charge_ledger_source_repayment"
          FOREIGN KEY ("sourceRepaymentId") REFERENCES "repayment"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END$$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_loan_charge_ledger_reversed_entry'
        ) THEN
          ALTER TABLE "loan_charge_ledger"
          ADD CONSTRAINT "FK_loan_charge_ledger_reversed_entry"
          FOREIGN KEY ("reversedLedgerEntryId") REFERENCES "loan_charge_ledger"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END$$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "loan_charge_ledger" DROP CONSTRAINT IF EXISTS "FK_loan_charge_ledger_reversed_entry"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loan_charge_ledger" DROP CONSTRAINT IF EXISTS "FK_loan_charge_ledger_source_repayment"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loan_charge_ledger" DROP CONSTRAINT IF EXISTS "FK_loan_charge_ledger_schedule"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loan_charge_ledger" DROP CONSTRAINT IF EXISTS "FK_loan_charge_ledger_loan"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_loan_charge_ledger_source_repayment"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_loan_charge_ledger_loan_type_event"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "loan_charge_ledger"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "loan_charge_ledger_eventtype_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "loan_charge_ledger_chargetype_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loan" DROP COLUMN IF EXISTS "penaltyPaid"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loan" DROP COLUMN IF EXISTS "pastDueInterestPaid"`,
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLoanLedgerEntry1762600000000
  implements MigrationInterface
{
  name = 'CreateLoanLedgerEntry1762600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "loan_ledger_entry" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "loanId" uuid NOT NULL,
        "entryType" character varying(64) NOT NULL,
        "debit" numeric(12,2) NOT NULL DEFAULT '0',
        "credit" numeric(12,2) NOT NULL DEFAULT '0',
        "balanceAfter" numeric(12,2) NOT NULL,
        "remarks" text,
        "createdById" uuid,
        "postedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "referenceType" character varying(64),
        "referenceId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_loan_ledger_entry_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_loan_ledger_entry_loan_posted_at"
      ON "loan_ledger_entry" ("loanId", "postedAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_loan_ledger_entry_type"
      ON "loan_ledger_entry" ("entryType")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_loan_ledger_entry_loan'
            AND table_name = 'loan_ledger_entry'
        ) THEN
          ALTER TABLE "loan_ledger_entry"
          ADD CONSTRAINT "FK_loan_ledger_entry_loan"
          FOREIGN KEY ("loanId") REFERENCES "loan"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "loan_ledger_entry"
      DROP CONSTRAINT IF EXISTS "FK_loan_ledger_entry_loan"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "public"."IDX_loan_ledger_entry_type"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "public"."IDX_loan_ledger_entry_loan_posted_at"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "loan_ledger_entry"`);
  }
}

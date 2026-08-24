import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActiveReversalUniqueness1763400000000
  implements MigrationInterface
{
  name = 'AddActiveReversalUniqueness1763400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_repayment_active_reversal_source"
      ON "repayment" ("relatedRepaymentId")
      WHERE "operationType" = 'reversal'
        AND "status" IN ('pending', 'approved')
        AND "relatedRepaymentId" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_repayment_active_reversal_source"`,
    );
  }
}

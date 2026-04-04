import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRepaymentApprovalFields1762000000000
  implements MigrationInterface
{
  name = 'AddRepaymentApprovalFields1762000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "repayment_status_enum" AS ENUM ('pending', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `ALTER TABLE "repayment" ADD "collectionDate" date`,
    );
    await queryRunner.query(
      `ALTER TABLE "repayment" ADD "useSavings" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "repayment" ADD "status" "repayment_status_enum" NOT NULL DEFAULT 'approved'`,
    );
    await queryRunner.query(
      `ALTER TABLE "repayment" ADD "createdById" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "repayment" ADD "approvedById" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "repayment" ADD "approvedAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "repayment" ADD "rejectedById" uuid`, 
    );
    await queryRunner.query(
      `ALTER TABLE "repayment" ADD "rejectedAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "repayment" ADD "rejectedReason" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "repayment" DROP COLUMN "rejectedReason"`);
    await queryRunner.query(`ALTER TABLE "repayment" DROP COLUMN "rejectedAt"`);
    await queryRunner.query(`ALTER TABLE "repayment" DROP COLUMN "rejectedById"`);
    await queryRunner.query(`ALTER TABLE "repayment" DROP COLUMN "approvedAt"`);
    await queryRunner.query(`ALTER TABLE "repayment" DROP COLUMN "approvedById"`);
    await queryRunner.query(`ALTER TABLE "repayment" DROP COLUMN "createdById"`);
    await queryRunner.query(`ALTER TABLE "repayment" DROP COLUMN "status"`);
    await queryRunner.query(`ALTER TABLE "repayment" DROP COLUMN "useSavings"`);
    await queryRunner.query(`ALTER TABLE "repayment" DROP COLUMN "collectionDate"`);
    await queryRunner.query(`DROP TYPE "repayment_status_enum"`);
  }
}

import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateLoanTable1756007416238 implements MigrationInterface {
    name = 'UpdateLoanTable1756007416238'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "loan" DROP COLUMN "savingsRequired"`);
        await queryRunner.query(`ALTER TABLE "loan" DROP COLUMN "savingsPaid"`);
        await queryRunner.query(`ALTER TABLE "loan" DROP COLUMN "savingsStatus"`);
        await queryRunner.query(`ALTER TABLE "loan" ADD "savings" numeric(12,2) NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "loan" DROP COLUMN "savings"`);
        await queryRunner.query(`ALTER TABLE "loan" ADD "savingsStatus" character varying NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE "loan" ADD "savingsPaid" numeric(12,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "loan" ADD "savingsRequired" numeric(12,2) NOT NULL DEFAULT '0'`);
    }

}

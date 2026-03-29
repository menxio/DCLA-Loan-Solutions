import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceUserRoleColumnWithRoleRelation1761115000000
  implements MigrationInterface
{
  name = 'ReplaceUserRoleColumnWithRoleRelation1761115000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SELECT 1`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SELECT 1`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueCollectionPerMemberCenterDate1762300000000
  implements MigrationInterface
{
  name = 'AddUniqueCollectionPerMemberCenterDate1762300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "collection" ADD CONSTRAINT "UQ_collection_member_center_date" UNIQUE ("memberId", "centerId", "collectionDate")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "collection" DROP CONSTRAINT "UQ_collection_member_center_date"`,
    );
  }
}


import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceUserRoleColumnWithRoleRelation1761115000000
  implements MigrationInterface
{
  name = 'ReplaceUserRoleColumnWithRoleRelation1761115000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD COLUMN "roleId" uuid`);
    await queryRunner.query(`
      UPDATE "user"
      SET "roleId" = "role"."id"
      FROM "role"
      WHERE "role"."name" = CASE
        WHEN "user"."role" = 'admin' THEN 'admin'
        ELSE 'loan processor'
      END
    `);
    await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "roleId" SET NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD CONSTRAINT "FK_user_role"
      FOREIGN KEY ("roleId") REFERENCES "role"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`CREATE INDEX "IDX_user_roleId" ON "user" ("roleId")`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "role"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD COLUMN "role" character varying NOT NULL DEFAULT 'user'`);
    await queryRunner.query(`
      UPDATE "user"
      SET "role" = CASE
        WHEN "role"."name" = 'admin' THEN 'admin'
        ELSE 'user'
      END
      FROM "role"
      WHERE "role"."id" = "user"."roleId"
    `);
    await queryRunner.query(`DROP INDEX "public"."IDX_user_roleId"`);
    await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_user_role"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "roleId"`);
  }
}

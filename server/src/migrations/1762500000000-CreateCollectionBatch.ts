import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCollectionBatch1762500000000
  implements MigrationInterface
{
  name = 'CreateCollectionBatch1762500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "collection_batch_status_enum" AS ENUM ('pending', 'approved', 'rejected')`,
    );

    await queryRunner.query(`
      CREATE TABLE "collection_batch" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "centerId" uuid NOT NULL,
        "collectionDate" date NOT NULL,
        "status" "collection_batch_status_enum" NOT NULL DEFAULT 'pending',
        "submittedById" uuid,
        "submittedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "approvedById" uuid,
        "approvedAt" TIMESTAMP,
        "rejectedById" uuid,
        "rejectedAt" TIMESTAMP,
        "rejectedReason" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_collection_batch_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_collection_batch_center" FOREIGN KEY ("centerId") REFERENCES "center"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_collection_batch_status_date_center" ON "collection_batch" ("status", "collectionDate", "centerId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_collection_batch_pending_center_date" ON "collection_batch" ("centerId", "collectionDate") WHERE "status" = 'pending'`,
    );

    await queryRunner.query(`ALTER TABLE "repayment" ADD "batchId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "repayment" ADD CONSTRAINT "FK_repayment_batch" FOREIGN KEY ("batchId") REFERENCES "collection_batch"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_repayment_batch_status" ON "repayment" ("batchId", "status")`,
    );

    await queryRunner.query(`
      INSERT INTO "collection_batch" (
        "centerId",
        "collectionDate",
        "status",
        "submittedAt",
        "createdAt",
        "updatedAt"
      )
      SELECT
        r."centerId",
        COALESCE(r."collectionDate", (r."createdAt" AT TIME ZONE 'UTC')::date),
        'pending',
        MIN(r."createdAt"),
        now(),
        now()
      FROM "repayment" r
      WHERE r."status" = 'pending'
        AND r."centerId" IS NOT NULL
      GROUP BY
        r."centerId",
        COALESCE(r."collectionDate", (r."createdAt" AT TIME ZONE 'UTC')::date)
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      UPDATE "repayment" r
      SET "batchId" = b."id"
      FROM "collection_batch" b
      WHERE r."status" = 'pending'
        AND r."batchId" IS NULL
        AND r."centerId" = b."centerId"
        AND COALESCE(r."collectionDate", (r."createdAt" AT TIME ZONE 'UTC')::date) = b."collectionDate"
        AND b."status" = 'pending'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_repayment_batch_status"`);
    await queryRunner.query(
      `ALTER TABLE "repayment" DROP CONSTRAINT "FK_repayment_batch"`,
    );
    await queryRunner.query(`ALTER TABLE "repayment" DROP COLUMN "batchId"`);

    await queryRunner.query(
      `DROP INDEX "public"."UQ_collection_batch_pending_center_date"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_collection_batch_status_date_center"`,
    );
    await queryRunner.query(`DROP TABLE "collection_batch"`);
    await queryRunner.query(`DROP TYPE "collection_batch_status_enum"`);
  }
}

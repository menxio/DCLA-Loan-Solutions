import { DataSource, Repository } from 'typeorm';
import { Center } from '../src/centers/entities/center.entity';
import { Collection } from '../src/collections/entities/collection.entity';
import { LoanWaiver } from '../src/loans/entities/loan-waiver.entity';
import { Loan } from '../src/loans/loan.entity';
import { LoansService } from '../src/loans/loans.service';
import { Member } from '../src/members/entities/member.entity';
import { CollectionBatch } from '../src/repayments/entities/collection-batch.entity';
import { LoanRepaymentAllocation } from '../src/repayments/entities/loan-repayment-allocation.entity';
import { LoanRepaymentSchedule } from '../src/repayments/entities/loan-repayment-schedule.entity';
import {
  Repayment,
  RepaymentOperationType,
  RepaymentStatus,
} from '../src/repayments/repayment.entity';
import { RepaymentsService } from '../src/repayments/repayments.service';
import { Savings } from '../src/savings/savings.entity';
import { SavingsService } from '../src/savings/savings.service';
import { Role } from '../src/roles/role.entity';
import { User } from '../src/users/user.entity';

jest.setTimeout(30_000);

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const concurrencyEnabled = process.env.RUN_SAVINGS_CONCURRENCY_TESTS === 'true';

if (concurrencyEnabled && !testDatabaseUrl) {
  throw new Error(
    'RUN_SAVINGS_CONCURRENCY_TESTS requires an isolated TEST_DATABASE_URL',
  );
}

const describeWithPostgres =
  concurrencyEnabled && testDatabaseUrl ? describe : describe.skip;

describeWithPostgres('Savings correctness against real PostgreSQL', () => {
  const schema = `savings_concurrency_${Date.now()}_${Math.random()
    .toString(16)
    .slice(2)}`;
  const testEntities = [
    Center,
    Member,
    Loan,
    LoanWaiver,
    Savings,
    Collection,
    Repayment,
    CollectionBatch,
    LoanRepaymentSchedule,
    LoanRepaymentAllocation,
    Role,
    User,
  ];
  let adminDataSource: DataSource;
  let dataSource: DataSource;
  let loanRepository: Repository<Loan>;
  let savingsRepository: Repository<Savings>;
  let repaymentRepository: Repository<Repayment>;
  let allocationRepository: Repository<LoanRepaymentAllocation>;
  let scheduleRepository: Repository<LoanRepaymentSchedule>;
  let collectionRepository: Repository<Collection>;
  let savingsService: SavingsService;
  let repaymentsService: RepaymentsService;

  const table = (name: string) => `"${schema}"."${name}"`;

  beforeAll(async () => {
    if (!/^savings_concurrency_\d+_[0-9a-f]+$/.test(schema)) {
      throw new Error('Unsafe concurrency-test schema name');
    }
    adminDataSource = new DataSource({
      type: 'postgres',
      url: testDatabaseUrl,
    });
    await adminDataSource.initialize();
    await adminDataSource.query(`CREATE SCHEMA "${schema}"`);

    dataSource = new DataSource({
      type: 'postgres',
      url: testDatabaseUrl,
      schema,
      synchronize: true,
      entities: testEntities,
    });
    await dataSource.initialize();

    for (const entity of testEntities) {
      const metadata = dataSource.getMetadata(entity);
      if (
        metadata.schema !== schema ||
        !metadata.tablePath.startsWith(`${schema}.`)
      ) {
        throw new Error(
          `Entity ${metadata.name} resolved outside isolated schema ${schema}`,
        );
      }
    }

    loanRepository = dataSource.getRepository(Loan);
    savingsRepository = dataSource.getRepository(Savings);
    repaymentRepository = dataSource.getRepository(Repayment);
    allocationRepository = dataSource.getRepository(LoanRepaymentAllocation);
    scheduleRepository = dataSource.getRepository(LoanRepaymentSchedule);
    collectionRepository = dataSource.getRepository(Collection);

    const loansService = new LoansService(
      loanRepository,
      dataSource.getRepository(Member),
      collectionRepository,
      savingsRepository,
      scheduleRepository,
      dataSource.getRepository(LoanWaiver),
    );
    savingsService = new SavingsService(
      savingsRepository,
      dataSource.getRepository(Member),
      loanRepository,
    );
    repaymentsService = new RepaymentsService(
      repaymentRepository,
      loanRepository,
      dataSource.getRepository(Member),
      dataSource.getRepository(Center),
      collectionRepository,
      scheduleRepository,
      allocationRepository,
      savingsRepository,
      dataSource.getRepository(CollectionBatch),
      loansService,
    );
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    if (adminDataSource?.isInitialized) {
      await adminDataSource.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      const [remainingSchema] = await adminDataSource.query<
        Array<{ exists: boolean }>
      >(
        'SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = $1) AS "exists"',
        [schema],
      );
      expect(remainingSchema?.exists).toBe(false);
      await adminDataSource.destroy();
    }
  });

  beforeEach(async () => {
    await dataSource.query(
      `TRUNCATE TABLE ${table('center')} RESTART IDENTITY CASCADE`,
    );
  });

  async function createFixture(initialSavings = 5000) {
    const center = await dataSource.getRepository(Center).save(
      dataSource.getRepository(Center).create({
        name: `Center ${Math.random()}`,
        collectionDay: 'Wednesday',
        address: 'Test address',
        leader: 'Test leader',
      }),
    );
    const member = await dataSource.getRepository(Member).save(
      dataSource.getRepository(Member).create({
        firstName: 'Savings',
        middleName: 'Concurrency',
        lastName: 'Test',
        contactNumber: '09171234567',
        address: 'Test address',
        birthDate: new Date('1990-01-01T00:00:00.000Z'),
        center,
        centerId: center.id,
      }),
    );
    const loan = await loanRepository.save(
      loanRepository.create({
        borrower: member,
        principalAmount: 12000,
        termWeeks: 4,
        interestRate: 0,
        status: 'active',
        weeklyPaymentAmount: 3000,
        amountPaid: 0,
        balance: 12000,
        advancePaymentBuffer: 0,
        totalAmount: 12000,
        serviceCharge: 0,
        notarialFee: 0,
        savings: initialSavings,
        existingSavings: 0,
        weeksPaid: 0,
        paymentCountDisplayOffset: 1,
        netCashReleased: 12000,
        pastDueInterestAccrued: 0,
        pastDueInterestWaived: 0,
        penaltyAccrued: 0,
        penaltyWaived: 0,
        loanCreatedDate: new Date('2026-08-01T00:00:00.000Z'),
      }),
    );
    return { center, member, loan };
  }

  async function createPendingPayment(
    fixture: Awaited<ReturnType<typeof createFixture>>,
  ) {
    return repaymentRepository.save(
      repaymentRepository.create({
        loan: fixture.loan,
        member: fixture.member,
        center: fixture.center,
        amount: 0,
        notes: 'Savings repayment',
        collectionDate: '2026-09-02',
        paymentDate: '2026-09-02',
        useSavings: true,
        status: RepaymentStatus.PENDING,
        operationType: RepaymentOperationType.PAYMENT,
        relatedRepaymentId: null,
        batch: null,
        batchId: null,
        createdById: null,
        approvedById: null,
        approvedAt: null,
        rejectedById: null,
        rejectedAt: null,
        rejectedReason: null,
      }),
    );
  }

  async function createPendingReversal(
    original: Repayment,
    fixture: Awaited<ReturnType<typeof createFixture>>,
  ) {
    return repaymentRepository.save(
      repaymentRepository.create({
        loan: fixture.loan,
        member: fixture.member,
        center: fixture.center,
        amount: Number(original.amount),
        notes: 'Concurrent reversal',
        collectionDate: '2026-09-02',
        paymentDate: null,
        useSavings: false,
        status: RepaymentStatus.PENDING,
        operationType: RepaymentOperationType.REVERSAL,
        relatedRepaymentId: original.id,
        batch: null,
        batchId: null,
        createdById: null,
        approvedById: null,
        approvedAt: null,
        rejectedById: null,
        rejectedAt: null,
        rejectedReason: null,
      }),
    );
  }

  async function persistedSavings(loanId: string) {
    const loan = await loanRepository.findOneByOrFail({ id: loanId });
    const entries = await savingsRepository.find({
      where: { loan: { id: loanId } },
      order: { createdAt: 'ASC' },
    });
    return { loan, entries };
  }

  it('A. serializes two withdrawals', async () => {
    const fixture = await createFixture();
    const results = await Promise.allSettled([
      savingsService.withdraw({
        memberId: fixture.member.id,
        loanId: fixture.loan.id,
        amount: 4000,
      }),
      savingsService.withdraw({
        memberId: fixture.member.id,
        loanId: fixture.loan.id,
        amount: 4000,
      }),
    ]);
    const persisted = await persistedSavings(fixture.loan.id);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    expect(Number(persisted.loan.savings)).toBe(1000);
    expect(persisted.entries.map((entry) => Number(entry.amount))).toEqual([
      -4000,
    ]);
  });

  it('B. preserves two concurrent deposits', async () => {
    const fixture = await createFixture();
    await Promise.all([
      savingsService.deposit({
        memberId: fixture.member.id,
        loanId: fixture.loan.id,
        amount: 1000,
      }),
      savingsService.deposit({
        memberId: fixture.member.id,
        loanId: fixture.loan.id,
        amount: 2000,
      }),
    ]);
    const persisted = await persistedSavings(fixture.loan.id);

    expect(Number(persisted.loan.savings)).toBe(8000);
    expect(
      persisted.entries.map((entry) => Number(entry.amount)).sort(),
    ).toEqual([1000, 2000]);
  });

  it('C. preserves a concurrent deposit and withdrawal', async () => {
    const fixture = await createFixture();
    await Promise.all([
      savingsService.deposit({
        memberId: fixture.member.id,
        loanId: fixture.loan.id,
        amount: 1000,
      }),
      savingsService.withdraw({
        memberId: fixture.member.id,
        loanId: fixture.loan.id,
        amount: 2000,
      }),
    ]);
    const persisted = await persistedSavings(fixture.loan.id);

    expect(Number(persisted.loan.savings)).toBe(4000);
    expect(
      persisted.entries.map((entry) => Number(entry.amount)).sort(),
    ).toEqual([-2000, 1000]);
  });

  it('D. serializes repayment savings usage with withdrawal', async () => {
    const fixture = await createFixture();
    const repayment = await createPendingPayment(fixture);
    const results = await Promise.allSettled([
      repaymentsService.approveRepayment(repayment.id),
      savingsService.withdraw({
        memberId: fixture.member.id,
        loanId: fixture.loan.id,
        amount: 4000,
      }),
    ]);
    const persisted = await persistedSavings(fixture.loan.id);
    const approved = await repaymentRepository.findOneByOrFail({
      id: repayment.id,
    });
    const signedEntryTotal = persisted.entries.reduce(
      (sum, entry) => sum + Number(entry.amount),
      0,
    );
    const allocations = await allocationRepository.find({
      where: { repaymentId: repayment.id },
    });
    const allocatedSavings = allocations.reduce(
      (sum, allocation) => sum + Number(allocation.savingsPortion),
      0,
    );
    const withdrawalSucceeded = results[1].status === 'fulfilled';

    expect(results[0].status).toBe('fulfilled');
    expect(approved.status).toBe(RepaymentStatus.APPROVED);
    expect(Number(persisted.loan.savings)).toBeGreaterThanOrEqual(0);
    expect(Number(persisted.loan.savings)).toBe(5000 + signedEntryTotal);
    expect(persisted.entries.every((entry) => Number(entry.amount) < 0)).toBe(
      true,
    );
    expect(allocatedSavings).toBe(Number(persisted.loan.amountPaid));
    if (withdrawalSucceeded) {
      expect(Number(persisted.loan.savings)).toBe(0);
      expect(Number(persisted.loan.amountPaid)).toBe(1000);
      expect(persisted.entries).toHaveLength(2);
    } else {
      expect(Number(persisted.loan.savings)).toBe(2000);
      expect(Number(persisted.loan.amountPaid)).toBe(3000);
      expect(persisted.entries).toHaveLength(1);
    }
  });

  it('E. restores repayment savings exactly once under double reversal', async () => {
    const fixture = await createFixture();
    const payment = await createPendingPayment(fixture);
    await repaymentsService.approveRepayment(payment.id);
    const reversalA = await createPendingReversal(payment, fixture);
    const reversalB = await createPendingReversal(payment, fixture);

    const results = await Promise.allSettled([
      repaymentsService.approveRepayment(reversalA.id),
      repaymentsService.approveRepayment(reversalB.id),
    ]);
    const persisted = await persistedSavings(fixture.loan.id);
    const reversals = await repaymentRepository.find({
      where: {
        relatedRepaymentId: payment.id,
        operationType: RepaymentOperationType.REVERSAL,
      },
    });
    const collection = await collectionRepository.findOneByOrFail({
      memberId: fixture.member.id,
      centerId: fixture.center.id,
      collectionDate: '2026-09-02',
    });

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    expect(Number(persisted.loan.savings)).toBe(5000);
    expect(Number(persisted.loan.amountPaid)).toBe(0);
    expect(Number(persisted.loan.balance)).toBe(12000);
    expect(
      persisted.entries.filter((entry) => Number(entry.amount) > 0),
    ).toHaveLength(1);
    expect(
      Number(
        persisted.entries.filter((entry) => Number(entry.amount) > 0)[0].amount,
      ),
    ).toBe(3000);
    expect(
      reversals.filter((entry) => entry.status === RepaymentStatus.APPROVED),
    ).toHaveLength(1);
    expect(
      await allocationRepository.countBy({ repaymentId: payment.id }),
    ).toBe(0);
    expect(Number(collection.paymentReceived)).toBe(0);
  });

  async function installLoanSavingsFailureTrigger() {
    await dataSource.query(`
      CREATE OR REPLACE FUNCTION "${schema}"."fail_savings_balance_update"()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'forced loan savings update failure';
      END;
      $$ LANGUAGE plpgsql
    `);
    await dataSource.query(`
      CREATE TRIGGER "fail_savings_balance_update"
      BEFORE UPDATE OF "savings" ON ${table('loan')}
      FOR EACH ROW EXECUTE FUNCTION "${schema}"."fail_savings_balance_update"()
    `);
  }

  async function dropLoanSavingsFailureTrigger() {
    await dataSource.query(
      `DROP TRIGGER IF EXISTS "fail_savings_balance_update" ON ${table('loan')}`,
    );
    await dataSource.query(
      `DROP FUNCTION IF EXISTS "${schema}"."fail_savings_balance_update"()`,
    );
  }

  it.each(['deposit', 'withdraw'] as const)(
    'rolls back a manual %s after history insertion',
    async (operation) => {
      const fixture = await createFixture();
      await installLoanSavingsFailureTrigger();
      try {
        await expect(
          savingsService[operation]({
            memberId: fixture.member.id,
            loanId: fixture.loan.id,
            amount: 1000,
          }),
        ).rejects.toThrow('forced loan savings update failure');
      } finally {
        await dropLoanSavingsFailureTrigger();
      }
      const persisted = await persistedSavings(fixture.loan.id);
      expect(Number(persisted.loan.savings)).toBe(5000);
      expect(persisted.entries).toHaveLength(0);
    },
  );

  it('rolls back repayment posting after the savings debit', async () => {
    const fixture = await createFixture();
    const repayment = await createPendingPayment(fixture);
    await dataSource.query(`
      CREATE OR REPLACE FUNCTION "${schema}"."fail_collection_write"()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'forced collection write failure';
      END;
      $$ LANGUAGE plpgsql
    `);
    await dataSource.query(`
      CREATE TRIGGER "fail_collection_write"
      BEFORE INSERT OR UPDATE ON ${table('collection')}
      FOR EACH ROW EXECUTE FUNCTION "${schema}"."fail_collection_write"()
    `);
    try {
      await expect(
        repaymentsService.approveRepayment(repayment.id),
      ).rejects.toThrow('forced collection write failure');
    } finally {
      await dataSource.query(
        `DROP TRIGGER IF EXISTS "fail_collection_write" ON ${table('collection')}`,
      );
      await dataSource.query(
        `DROP FUNCTION IF EXISTS "${schema}"."fail_collection_write"()`,
      );
    }

    const persisted = await persistedSavings(fixture.loan.id);
    const storedRepayment = await repaymentRepository.findOneByOrFail({
      id: repayment.id,
    });
    expect(Number(persisted.loan.savings)).toBe(5000);
    expect(Number(persisted.loan.amountPaid)).toBe(0);
    expect(persisted.entries).toHaveLength(0);
    expect(storedRepayment.status).toBe(RepaymentStatus.PENDING);
    expect(await allocationRepository.count()).toBe(0);
    expect(await scheduleRepository.count()).toBe(0);
    expect(await collectionRepository.count()).toBe(0);
  });

  it('rolls back reversal posting after the savings restoration', async () => {
    const fixture = await createFixture();
    const payment = await createPendingPayment(fixture);
    await repaymentsService.approveRepayment(payment.id);
    const reversal = await createPendingReversal(payment, fixture);
    await dataSource.query(`
      CREATE OR REPLACE FUNCTION "${schema}"."fail_collection_update"()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'forced collection update failure';
      END;
      $$ LANGUAGE plpgsql
    `);
    await dataSource.query(`
      CREATE TRIGGER "fail_collection_update"
      BEFORE UPDATE ON ${table('collection')}
      FOR EACH ROW EXECUTE FUNCTION "${schema}"."fail_collection_update"()
    `);
    try {
      await expect(
        repaymentsService.approveRepayment(reversal.id),
      ).rejects.toThrow('forced collection update failure');
    } finally {
      await dataSource.query(
        `DROP TRIGGER IF EXISTS "fail_collection_update" ON ${table('collection')}`,
      );
      await dataSource.query(
        `DROP FUNCTION IF EXISTS "${schema}"."fail_collection_update"()`,
      );
    }

    const persisted = await persistedSavings(fixture.loan.id);
    const storedReversal = await repaymentRepository.findOneByOrFail({
      id: reversal.id,
    });
    const collection = await collectionRepository.findOneByOrFail({
      memberId: fixture.member.id,
      centerId: fixture.center.id,
      collectionDate: '2026-09-02',
    });
    expect(Number(persisted.loan.savings)).toBe(2000);
    expect(Number(persisted.loan.amountPaid)).toBe(3000);
    expect(persisted.entries).toHaveLength(1);
    expect(Number(persisted.entries[0].amount)).toBe(-3000);
    expect(storedReversal.status).toBe(RepaymentStatus.PENDING);
    expect(
      await allocationRepository.countBy({ repaymentId: payment.id }),
    ).toBe(1);
    expect(Number(collection.paymentReceived)).toBe(3000);
  });
});

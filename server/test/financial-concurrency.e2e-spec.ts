import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { DataSource, Repository } from 'typeorm';
import { BusinessTimeService } from '../src/common/business-time/business-time.service';
import { Center } from '../src/centers/entities/center.entity';
import { Collection } from '../src/collections/entities/collection.entity';
import { Loan } from '../src/loans/loan.entity';
import {
  LoanChargeLedger,
  LoanChargeLedgerEventType,
  LoanChargeType,
} from '../src/loans/entities/loan-charge-ledger.entity';
import { LoanWaiver } from '../src/loans/entities/loan-waiver.entity';
import { LoansService } from '../src/loans/loans.service';
import { Member } from '../src/members/entities/member.entity';
import { CollectionBatch } from '../src/repayments/entities/collection-batch.entity';
import { LoanRepaymentAllocation } from '../src/repayments/entities/loan-repayment-allocation.entity';
import {
  LoanRepaymentSchedule,
  LoanRepaymentStatus,
} from '../src/repayments/entities/loan-repayment-schedule.entity';
import {
  Repayment,
  RepaymentOperationType,
  RepaymentStatus,
} from '../src/repayments/repayment.entity';
import { RepaymentsService } from '../src/repayments/repayments.service';
import { Savings } from '../src/savings/savings.entity';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const runConcurrencyTests =
  process.env.RUN_FINANCIAL_CONCURRENCY_TESTS === 'true' && testDatabaseUrl;
const describePostgres = runConcurrencyTests ? describe : describe.skip;

describePostgres('financial concurrency (PostgreSQL)', () => {
  const schema = `financial_concurrency_${process.pid}_${Date.now()}`;
  const managerAId = '00000000-0000-4000-8000-000000000001';
  const managerBId = '00000000-0000-4000-8000-000000000002';
  const cashierAId = '00000000-0000-4000-8000-000000000003';
  let adminDataSource: DataSource;
  let dataSource: DataSource;
  let loansService: LoansService;
  let repaymentsService: RepaymentsService;
  let centerRepository: Repository<Center>;
  let memberRepository: Repository<Member>;
  let loanRepository: Repository<Loan>;
  let scheduleRepository: Repository<LoanRepaymentSchedule>;
  let repaymentRepository: Repository<Repayment>;
  let allocationRepository: Repository<LoanRepaymentAllocation>;
  let ledgerRepository: Repository<LoanChargeLedger>;
  let waiverRepository: Repository<LoanWaiver>;
  let collectionRepository: Repository<Collection>;

  beforeAll(async () => {
    adminDataSource = new DataSource({
      type: 'postgres',
      url: testDatabaseUrl,
      ssl: false,
    });
    await adminDataSource.initialize();
    await adminDataSource.query(`CREATE SCHEMA "${schema}"`);

    const entityGlob = join(__dirname, '../src/**/*.entity{.ts,.js}').replace(
      /\\/g,
      '/',
    );
    dataSource = new DataSource({
      type: 'postgres',
      url: testDatabaseUrl,
      schema,
      entities: [entityGlob],
      synchronize: true,
      extra: { max: 10 },
      ssl: false,
    });
    await dataSource.initialize();

    centerRepository = dataSource.getRepository(Center);
    memberRepository = dataSource.getRepository(Member);
    loanRepository = dataSource.getRepository(Loan);
    scheduleRepository = dataSource.getRepository(LoanRepaymentSchedule);
    repaymentRepository = dataSource.getRepository(Repayment);
    allocationRepository = dataSource.getRepository(LoanRepaymentAllocation);
    ledgerRepository = dataSource.getRepository(LoanChargeLedger);
    waiverRepository = dataSource.getRepository(LoanWaiver);
    collectionRepository = dataSource.getRepository(Collection);

    const businessTime = new BusinessTimeService({
      get: () => 'Asia/Manila',
    } as unknown as ConfigService);
    loansService = new LoansService(
      loanRepository,
      memberRepository,
      collectionRepository,
      dataSource.getRepository(Savings),
      scheduleRepository,
      waiverRepository,
      ledgerRepository,
      repaymentRepository,
      dataSource,
      businessTime,
    );
    repaymentsService = new RepaymentsService(
      repaymentRepository,
      loanRepository,
      memberRepository,
      centerRepository,
      collectionRepository,
      scheduleRepository,
      allocationRepository,
      dataSource.getRepository(Savings),
      dataSource.getRepository(CollectionBatch),
      dataSource,
      loansService,
      businessTime,
    );
  }, 30_000);

  beforeEach(async () => {
    await dataSource.synchronize(true);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    if (adminDataSource?.isInitialized) {
      await adminDataSource.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await adminDataSource.destroy();
    }
  });

  async function seedLoan(
    options: {
      principal?: number;
      total?: number;
      weekly?: number;
      penaltyAccrued?: number;
      scheduleDates?: string[];
      scheduleDue?: number[];
    } = {},
  ) {
    const center = await centerRepository.save(
      centerRepository.create({
        name: `Center ${Date.now()} ${Math.random()}`,
        collectionDay: 'Sunday',
      }),
    );
    const member = await memberRepository.save(
      memberRepository.create({
        firstName: 'Concurrency',
        lastName: 'Borrower',
        middleName: 'Test',
        contactNumber: '09170000000',
        address: 'Test address',
        center,
        centerId: center.id,
      }),
    );
    const principal = options.principal ?? 1_500;
    const total = options.total ?? principal;
    const penaltyAccrued = options.penaltyAccrued ?? 0;
    const loan = await loanRepository.save(
      loanRepository.create({
        borrower: member,
        principalAmount: principal,
        termWeeks: 4,
        interestRate: 0,
        status: 'active',
        weeklyPaymentAmount: options.weekly ?? 1_000,
        amountPaid: 0,
        balance: total + penaltyAccrued,
        advancePaymentBuffer: 0,
        totalAmount: total,
        serviceCharge: 0,
        notarialFee: 0,
        savings: 0,
        existingSavings: 0,
        weeksPaid: 0,
        paymentCountDisplayOffset: 0,
        netCashReleased: 0,
        pastDueInterestAccrued: 0,
        pastDueInterestPaid: 0,
        pastDueInterestWaived: 0,
        penaltyAccrued,
        penaltyPaid: 0,
        penaltyWaived: 0,
        loanCreatedDate: new Date('2026-08-01T00:00:00Z'),
      }),
    );
    const dates = options.scheduleDates ?? [
      '2026-08-23',
      '2026-08-30',
      '2026-09-06',
      '2026-09-13',
    ];
    const dues = options.scheduleDue ?? [1_000, 500, 0, 0];
    const schedules = await scheduleRepository.save(
      dates.map((dueDate, index) =>
        scheduleRepository.create({
          loanId: loan.id,
          memberId: member.id,
          centerId: center.id,
          dueDate,
          weekNumber: index + 1,
          amountDue: dues[index] ?? 0,
          principalDue: dues[index] ?? 0,
          interestDue: 0,
          amountPaid: 0,
          status: LoanRepaymentStatus.UNPAID,
          advanceApplied: 0,
        }),
      ),
    );
    return { center, member, loan, schedules };
  }

  async function seedPendingRepayment(
    fixture: Awaited<ReturnType<typeof seedLoan>>,
    amount: number,
    collectionDate = '2026-08-21',
  ) {
    return repaymentRepository.save(
      repaymentRepository.create({
        loan: fixture.loan,
        member: fixture.member,
        center: fixture.center,
        amount,
        collectionDate,
        paymentDate: collectionDate,
        useSavings: false,
        status: RepaymentStatus.PENDING,
        operationType: RepaymentOperationType.PAYMENT,
        relatedRepaymentId: null,
        batchId: null,
        createdById: null,
      }),
    );
  }

  function fulfilledCount(results: PromiseSettledResult<unknown>[]) {
    return results.filter((result) => result.status === 'fulfilled').length;
  }

  it('A: applies the same repayment exactly once', async () => {
    const fixture = await seedLoan();
    const repayment = await seedPendingRepayment(fixture, 1_000);

    const results = await Promise.allSettled([
      repaymentsService.approveRepayment(repayment.id, managerAId),
      repaymentsService.approveRepayment(repayment.id, managerBId),
    ]);

    expect(fulfilledCount(results)).toBe(1);
    expect(
      Number(
        (await loanRepository.findOneByOrFail({ id: fixture.loan.id }))
          .amountPaid,
      ),
    ).toBe(1_000);
    expect(
      Number(
        (await allocationRepository
          .createQueryBuilder('allocation')
          .select('COALESCE(SUM(allocation.amountApplied), 0)', 'total')
          .getRawOne<{ total: string }>())!.total,
      ),
    ).toBe(1_000);
    expect(
      (await repaymentRepository.findOneByOrFail({ id: repayment.id })).status,
    ).toBe(RepaymentStatus.APPROVED);
  });

  it('B: serializes two different repayments against the same loan', async () => {
    const fixture = await seedLoan();
    const repaymentA = await seedPendingRepayment(fixture, 1_000);
    const repaymentB = await seedPendingRepayment(fixture, 1_000);

    const results = await Promise.allSettled([
      repaymentsService.approveRepayment(repaymentA.id, managerAId),
      repaymentsService.approveRepayment(repaymentB.id, managerBId),
    ]);

    expect(fulfilledCount(results)).toBe(2);
    const loan = await loanRepository.findOneByOrFail({ id: fixture.loan.id });
    const allocations = await allocationRepository.find({
      where: [{ repaymentId: repaymentA.id }, { repaymentId: repaymentB.id }],
    });
    expect(Number(loan.amountPaid)).toBe(2_000);
    expect(Number(loan.balance)).toBe(0);
    expect(
      allocations.reduce((sum, row) => sum + Number(row.amountApplied), 0),
    ).toBe(2_000);
    const schedules = await scheduleRepository.find({
      where: { loanId: fixture.loan.id },
      order: { weekNumber: 'ASC' },
    });
    expect(
      schedules.reduce(
        (sum, schedule) => sum + Number(schedule.advanceApplied),
        0,
      ),
    ).toBe(500);
    expect(
      Number(
        (
          await collectionRepository.findOneByOrFail({
            memberId: fixture.member.id,
            centerId: fixture.center.id,
            collectionDate: '2026-08-21',
          })
        ).paymentReceived,
      ),
    ).toBe(2_000);
    expect(
      await repaymentRepository.count({
        where: {
          loan: { id: fixture.loan.id },
          status: RepaymentStatus.APPROVED,
        },
      }),
    ).toBe(2);
  });

  it('C: posts one weekly charge under concurrent scheduler attempts', async () => {
    const fixture = await seedLoan({
      weekly: 900,
      scheduleDue: [900, 600, 0, 0],
    });
    await Promise.all([
      loansService.postOverdueChargesForLoan(fixture.loan.id, '2026-08-29'),
      loansService.postOverdueChargesForLoan(fixture.loan.id, '2026-08-29'),
    ]);

    expect(await ledgerRepository.count()).toBe(1);
    expect(
      Number(
        (await loanRepository.findOneByOrFail({ id: fixture.loan.id }))
          .penaltyAccrued,
      ),
    ).toBe(50);
  });

  it('D: scheduler and manual sweep produce one financial result', async () => {
    const fixture = await seedLoan({
      weekly: 900,
      scheduleDue: [900, 600, 0, 0],
    });
    await Promise.all([
      loansService.postOverdueChargesForActiveLoans('2026-08-29'),
      loansService.postOverdueChargesForActiveLoans('2026-08-29'),
    ]);

    expect(await ledgerRepository.count()).toBe(1);
    expect(
      Number(
        (await loanRepository.findOneByOrFail({ id: fixture.loan.id }))
          .penaltyAccrued,
      ),
    ).toBe(50);
  });

  it('E: preserves a Friday-effective payment raced with Saturday posting', async () => {
    const fixture = await seedLoan({
      weekly: 1_000,
      scheduleDue: [1_000, 500, 0, 0],
    });
    const repayment = await seedPendingRepayment(fixture, 1_000, '2026-08-28');

    await Promise.all([
      loansService.postOverdueChargesForLoan(fixture.loan.id, '2026-08-29'),
      repaymentsService.approveRepayment(repayment.id, managerAId),
    ]);

    expect(
      await ledgerRepository.count({
        where: { eventType: LoanChargeLedgerEventType.ACCRUAL },
      }),
    ).toBe(0);
    expect(
      Number(
        (await loanRepository.findOneByOrFail({ id: fixture.loan.id }))
          .amountPaid,
      ),
    ).toBe(1_000);
  });

  it('F: reverses one repayment exactly once', async () => {
    const fixture = await seedLoan();
    const payment = await seedPendingRepayment(fixture, 1_000);
    await repaymentsService.approveRepayment(payment.id, managerAId);

    const initiallyApprovedPayment = await repaymentRepository.findOneByOrFail({
      id: payment.id,
    });
    const initialAllocations = await allocationRepository.find({
      where: { repaymentId: payment.id },
    });
    expect(initiallyApprovedPayment.status).toBe(RepaymentStatus.APPROVED);
    expect(
      initialAllocations.reduce(
        (sum, allocation) => sum + Number(allocation.amountApplied),
        0,
      ),
    ).toBe(1_000);

    const reversal = await repaymentsService.requestReversal(
      payment.id,
      { reason: 'test reversal' },
      { userId: cashierAId, role: 'cashier' },
    );

    const results = await Promise.allSettled([
      repaymentsService.approveRepayment(reversal.id, managerAId),
      repaymentsService.approveRepayment(reversal.id, managerBId),
    ]);

    expect(fulfilledCount(results)).toBe(1);
    const persistedLoan = await loanRepository.findOneByOrFail({
      id: fixture.loan.id,
    });
    const persistedSchedules = await scheduleRepository.find({
      where: { loanId: fixture.loan.id },
      order: { weekNumber: 'ASC' },
    });
    const persistedCollection = await collectionRepository.findOneByOrFail({
      memberId: fixture.member.id,
      centerId: fixture.center.id,
      collectionDate: '2026-08-21',
    });
    const persistedReversals = await repaymentRepository.find({
      where: {
        relatedRepaymentId: payment.id,
        operationType: RepaymentOperationType.REVERSAL,
      },
    });
    const persistedSavings = await dataSource.getRepository(Savings).find({
      where: { loan: { id: fixture.loan.id } },
    });

    expect(persistedReversals).toHaveLength(1);
    expect(persistedReversals[0].id).toBe(reversal.id);
    expect(persistedReversals[0].status).toBe(RepaymentStatus.APPROVED);
    expect(Number(persistedLoan.amountPaid)).toBe(0);
    expect(Number(persistedLoan.balance)).toBe(1_500);
    expect(Number(persistedLoan.advancePaymentBuffer)).toBe(0);
    expect(persistedLoan.weeksPaid).toBe(0);
    expect(Number(persistedLoan.savings)).toBe(0);
    expect(
      await allocationRepository.count({ where: { repaymentId: payment.id } }),
    ).toBe(0);
    expect(
      persistedSchedules.reduce(
        (sum, schedule) => sum + Number(schedule.amountPaid),
        0,
      ),
    ).toBe(0);
    expect(
      persistedSchedules.reduce(
        (sum, schedule) => sum + Number(schedule.advanceApplied),
        0,
      ),
    ).toBe(0);
    expect(
      persistedSchedules.every(
        (schedule) =>
          Number(schedule.amountPaid) >= 0 &&
          Number(schedule.advanceApplied) >= 0,
      ),
    ).toBe(true);
    expect(Number(persistedCollection.paymentReceived)).toBe(0);
    expect(persistedCollection.numberOfPayments).toBe(0);
    expect(Number(persistedCollection.advancePaymentAmount)).toBe(0);
    expect(persistedSavings).toHaveLength(0);
    expect(
      (await repaymentRepository.findOneByOrFail({ id: reversal.id })).status,
    ).toBe(RepaymentStatus.APPROVED);
  });

  it('G: prevents concurrent waivers from exceeding outstanding charges', async () => {
    const fixture = await seedLoan({ penaltyAccrued: 500 });
    const results = await Promise.allSettled([
      loansService.applyWaiver(
        fixture.loan.id,
        { penaltyWaiver: 400 },
        managerAId,
      ),
      loansService.applyWaiver(
        fixture.loan.id,
        { penaltyWaiver: 400 },
        managerBId,
      ),
    ]);

    expect(fulfilledCount(results)).toBe(1);
    const loan = await loanRepository.findOneByOrFail({ id: fixture.loan.id });
    const waivers = await waiverRepository.find({
      where: { loanId: fixture.loan.id },
    });
    expect(Number(loan.penaltyWaived)).toBe(400);
    expect(
      waivers.reduce((sum, row) => sum + Number(row.penaltyWaived), 0),
    ).toBe(400);
  });

  it('H: prevents overlapping maturity PDI periods', async () => {
    const fixture = await seedLoan({
      scheduleDates: ['2026-07-26', '2026-08-02', '2026-08-09', '2026-08-16'],
      scheduleDue: [375, 375, 375, 375],
    });
    await Promise.all([
      loansService.postOverdueChargesForLoan(fixture.loan.id, '2026-08-17'),
      loansService.postOverdueChargesForLoan(fixture.loan.id, '2026-08-18'),
    ]);

    const penaltyEntries = await ledgerRepository.find({
      where: { loanId: fixture.loan.id, chargeType: LoanChargeType.PENALTY },
    });
    const pdiEntries = await ledgerRepository.find({
      where: {
        loanId: fixture.loan.id,
        chargeType: LoanChargeType.PAST_DUE_INTEREST,
      },
      order: { periodStart: 'ASC' },
    });
    expect(penaltyEntries).toHaveLength(1);
    for (let index = 1; index < pdiEntries.length; index += 1) {
      expect(
        String(pdiEntries[index].periodStart) >
          String(pdiEntries[index - 1].periodEnd),
      ).toBe(true);
    }
    const loan = await loanRepository.findOneByOrFail({ id: fixture.loan.id });
    expect(Number(loan.penaltyAccrued)).toBe(450);
    expect(Number(loan.pastDueInterestAccrued)).toBe(10);
  });

  it('rolls back a charge ledger insert when the loan aggregate update fails', async () => {
    const fixture = await seedLoan({
      weekly: 900,
      scheduleDue: [900, 600, 0, 0],
    });
    await dataSource.query(`
      CREATE FUNCTION "${schema}"."fail_loan_update"() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'forced loan update failure'; END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER "fail_loan_update" BEFORE UPDATE ON "${schema}"."loan"
      FOR EACH ROW EXECUTE FUNCTION "${schema}"."fail_loan_update"();
    `);

    await expect(
      loansService.postOverdueChargesForLoan(fixture.loan.id, '2026-08-29'),
    ).rejects.toThrow('forced loan update failure');
    expect(await ledgerRepository.count()).toBe(0);
    expect(
      Number(
        (await loanRepository.findOneByOrFail({ id: fixture.loan.id }))
          .penaltyAccrued,
      ),
    ).toBe(0);
  });

  it('rolls back approval when allocation persistence fails', async () => {
    const fixture = await seedLoan();
    const repayment = await seedPendingRepayment(fixture, 1_000);
    await dataSource.query(`
      CREATE FUNCTION "${schema}"."fail_allocation_insert"() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'forced allocation failure'; END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER "fail_allocation_insert" BEFORE INSERT ON "${schema}"."loan_repayment_allocation"
      FOR EACH ROW EXECUTE FUNCTION "${schema}"."fail_allocation_insert"();
    `);

    await expect(
      repaymentsService.approveRepayment(repayment.id, managerAId),
    ).rejects.toThrow('forced allocation failure');
    expect(
      Number(
        (await loanRepository.findOneByOrFail({ id: fixture.loan.id }))
          .amountPaid,
      ),
    ).toBe(0);
    expect(
      Number(
        (
          await scheduleRepository.findOneByOrFail({
            id: fixture.schedules[0].id,
          })
        ).amountPaid,
      ),
    ).toBe(0);
    expect(
      (await repaymentRepository.findOneByOrFail({ id: repayment.id })).status,
    ).toBe(RepaymentStatus.PENDING);
    expect(await collectionRepository.count()).toBe(0);
  });
});

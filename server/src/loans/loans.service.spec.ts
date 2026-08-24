import { Test, TestingModule } from '@nestjs/testing';
import { LoansService } from './loans.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Loan } from './loan.entity';
import { Member } from '../members/entities/member.entity';
import { Collection } from '../collections/entities/collection.entity';
import { Savings } from '../savings/savings.entity';
import { LoanRepaymentSchedule } from '../repayments/entities/loan-repayment-schedule.entity';
import { LoanWaiver } from './entities/loan-waiver.entity';
import {
  LoanChargeLedger,
  LoanChargeLedgerEventType,
  LoanChargeType,
} from './entities/loan-charge-ledger.entity';
import { Repayment } from '../repayments/repayment.entity';
import { BusinessTimeService } from '../common/business-time/business-time.service';
import { ConfigService } from '@nestjs/config';

describe('LoansService', () => {
  let service: LoansService;
  let loanRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let scheduleRepository: {
    find: jest.Mock;
  };
  let chargeLedgerRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let ledgerEntries: LoanChargeLedger[];
  let pendingRepayments: Repayment[];
  let waiverRepository: { create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    ledgerEntries = [];
    pendingRepayments = [];
    waiverRepository = {
      create: jest.fn((waiver) => waiver),
      save: jest.fn(async (waiver) => ({ id: 'waiver-1', ...waiver })),
    };
    loanRepository = {
      findOne: jest.fn(),
      save: jest.fn(async (loan) => loan),
    };
    scheduleRepository = {
      find: jest.fn(),
    };
    chargeLedgerRepository = {
      findOne: jest.fn(async ({ where }) => {
        if (where.idempotencyKey) {
          return (
            ledgerEntries.find(
              (entry) => entry.idempotencyKey === where.idempotencyKey,
            ) ?? null
          );
        }

        if (
          where.chargeType === LoanChargeType.PAST_DUE_INTEREST &&
          where.eventType === LoanChargeLedgerEventType.ACCRUAL
        ) {
          return (
            ledgerEntries
              .filter(
                (entry) =>
                  entry.loanId === where.loanId &&
                  entry.chargeType === where.chargeType &&
                  entry.eventType === where.eventType,
              )
              .sort((left, right) =>
                String(right.periodEnd).localeCompare(String(left.periodEnd)),
              )[0] ?? null
          );
        }

        return null;
      }),
      find: jest.fn(async ({ where }) =>
        ledgerEntries.filter(
          (entry) =>
            entry.sourceRepaymentId === where.sourceRepaymentId &&
            entry.eventType === where.eventType,
        ),
      ),
      create: jest.fn((entry) => entry),
      save: jest.fn(async (entry) => {
        const saved = {
          id: `ledger-${ledgerEntries.length + 1}`,
          createdAt: new Date(),
          ...entry,
        } as LoanChargeLedger;
        ledgerEntries.push(saved);
        return saved;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoansService,
        { provide: getRepositoryToken(Loan), useValue: loanRepository },
        { provide: getRepositoryToken(Member), useValue: {} },
        { provide: getRepositoryToken(Collection), useValue: {} },
        { provide: getRepositoryToken(Savings), useValue: {} },
        {
          provide: getRepositoryToken(LoanRepaymentSchedule),
          useValue: scheduleRepository,
        },
        {
          provide: getRepositoryToken(LoanWaiver),
          useValue: waiverRepository,
        },
        {
          provide: getRepositoryToken(LoanChargeLedger),
          useValue: chargeLedgerRepository,
        },
        {
          provide: getRepositoryToken(Repayment),
          useValue: { find: jest.fn(async () => pendingRepayments) },
        },
        BusinessTimeService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => 'Asia/Manila') },
        },
      ],
    }).compile();

    service = module.get<LoansService>(LoansService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('24-week monthly interest validation', () => {
    it('converts the supplied monthly rate into the six-month interest rate', () => {
      const result = (service as any).calculateLoanDetails(10_000, 24, 3.33);

      expect(result.interestRate).toBeCloseTo(0.1998);
      expect(result.totalAmount).toBeCloseTo(11_998);
    });

    it.each([undefined, 3.32, 10.01])(
      'rejects an invalid 24-week monthly interest rate of %p',
      (monthlyInterestRate) => {
        expect(() =>
          (service as any).calculateLoanDetails(
            10_000,
            24,
            monthlyInterestRate,
          ),
        ).toThrow();
      },
    );

    it('rejects a monthly rate on fixed-rate terms', () => {
      expect(() =>
        (service as any).calculateLoanDetails(10_000, 12, 35),
      ).toThrow();
    });

    it('uses the regular weekly amount while leaving the exact remainder for the final schedule row', () => {
      const result = (service as any).calculateLoanDetails(10_000, 24, 10);

      expect(result.totalAmount).toBe(16_000);
      expect(result.weeklyPaymentAmount).toBe(670);
    });
  });

  describe('overdue charge posting', () => {
    const createLoan = (overrides: Partial<Loan> = {}): Loan =>
      ({
        id: 'loan-1',
        borrower: { id: 'member-1' },
        principalAmount: 3_000,
        totalAmount: 3_300,
        weeklyPaymentAmount: 900,
        amountPaid: 0,
        balance: 3_300,
        savings: 0,
        weeksPaid: 0,
        advancePaymentBuffer: 0,
        termWeeks: 3,
        status: 'active',
        pastDueInterestAccrued: 0,
        pastDueInterestPaid: 0,
        pastDueInterestWaived: 0,
        penaltyAccrued: 0,
        penaltyPaid: 0,
        penaltyWaived: 0,
        ...overrides,
      }) as Loan;

    it.each([
      [999.99, 50],
      [1_000, 100],
      [1_999.99, 100],
      [2_000, 200],
    ])(
      'uses the configured weekly penalty tier for an amortization of %p',
      (weeklyPaymentAmount, expectedPenalty) => {
        expect(
          (service as any).getWeeklyPenaltyAmount(weeklyPaymentAmount),
        ).toBe(expectedPenalty);
      },
    );

    it('posts one penalty at Saturday cutoff, not during Friday', async () => {
      const loan = createLoan();
      const schedules = [
        {
          id: 'schedule-1',
          loanId: loan.id,
          weekNumber: 1,
          dueDate: '2026-08-23',
          amountDue: 900,
          amountPaid: 500,
          principalDue: 800,
          interestDue: 100,
        },
        {
          id: 'schedule-2',
          loanId: loan.id,
          weekNumber: 2,
          dueDate: '2026-08-30',
          amountDue: 900,
          amountPaid: 0,
          principalDue: 800,
          interestDue: 100,
        },
        {
          id: 'schedule-3',
          loanId: loan.id,
          weekNumber: 3,
          dueDate: '2026-09-06',
          amountDue: 1_500,
          amountPaid: 0,
          principalDue: 1_400,
          interestDue: 100,
        },
      ] as LoanRepaymentSchedule[];
      loanRepository.findOne.mockResolvedValue(loan);
      scheduleRepository.find.mockResolvedValue(schedules);

      await service.postOverdueChargesForLoan(
        loan.id,
        '2026-08-28T15:59:59Z',
      );
      expect(ledgerEntries).toHaveLength(0);

      await service.postOverdueChargesForLoan(loan.id, '2026-08-28');
      expect(ledgerEntries).toHaveLength(0);

      await service.postOverdueChargesForLoan(
        loan.id,
        '2026-08-28T16:00:00Z',
      );
      await service.postOverdueChargesForLoan(loan.id, '2026-08-29');
      await service.postOverdueChargesForLoan(
        loan.id,
        '2026-08-28T16:00:01Z',
      );

      expect(ledgerEntries).toHaveLength(1);
      expect(ledgerEntries[0]).toMatchObject({
        scheduleId: 'schedule-1',
        chargeType: LoanChargeType.PENALTY,
        eventType: LoanChargeLedgerEventType.ACCRUAL,
        amount: 50,
        periodStart: '2026-08-29',
        periodEnd: '2026-08-29',
      });
      expect(loan.penaltyAccrued).toBe(50);
    });

    it('does not penalize an installment fully paid before cutoff', async () => {
      const loan = createLoan();
      loanRepository.findOne.mockResolvedValue(loan);
      scheduleRepository.find.mockResolvedValue([
        {
          id: 'schedule-1',
          dueDate: '2026-08-23',
          amountDue: 1_000,
          amountPaid: 1_000,
        },
        {
          id: 'schedule-2',
          dueDate: '2026-08-30',
          amountDue: 1_000,
          amountPaid: 0,
        },
      ] as LoanRepaymentSchedule[]);

      await service.postOverdueChargesForLoan(loan.id, '2026-08-29');

      expect(ledgerEntries).toHaveLength(0);
    });

    it('penalizes an installment that remains partially paid at cutoff', async () => {
      const loan = createLoan();
      loanRepository.findOne.mockResolvedValue(loan);
      scheduleRepository.find.mockResolvedValue([
        {
          id: 'schedule-1',
          dueDate: '2026-08-23',
          amountDue: 1_000,
          amountPaid: 700,
        },
        {
          id: 'schedule-2',
          dueDate: '2026-08-30',
          amountDue: 1_000,
          amountPaid: 0,
        },
      ] as LoanRepaymentSchedule[]);

      await service.postOverdueChargesForLoan(loan.id, '2026-08-29');

      expect(ledgerEntries).toHaveLength(1);
    });

    it('projects multiple pending Friday payments toward the cutoff', async () => {
      const loan = createLoan();
      loanRepository.findOne.mockResolvedValue(loan);
      scheduleRepository.find.mockResolvedValue([
        {
          id: 'schedule-1',
          dueDate: '2026-08-23',
          amountDue: 1_000,
          amountPaid: 0,
        },
        {
          id: 'schedule-2',
          dueDate: '2026-08-30',
          amountDue: 1_000,
          amountPaid: 0,
        },
      ] as LoanRepaymentSchedule[]);
      pendingRepayments = [400, 600].map(
        (amount, index) =>
          ({
            id: `repayment-${index}`,
            amount,
            collectionDate: '2026-08-28',
            createdAt: new Date(`2026-08-28T1${index}:00:00Z`),
          }) as Repayment,
      );

      await service.postOverdueChargesForLoan(loan.id, '2026-08-29');

      expect(ledgerEntries).toHaveLength(0);
    });

    it('penalizes when multiple pending Friday payments remain insufficient', async () => {
      const loan = createLoan();
      loanRepository.findOne.mockResolvedValue(loan);
      scheduleRepository.find.mockResolvedValue([
        {
          id: 'schedule-1',
          dueDate: '2026-08-23',
          amountDue: 1_000,
          amountPaid: 0,
        },
        {
          id: 'schedule-2',
          dueDate: '2026-08-30',
          amountDue: 1_000,
          amountPaid: 0,
        },
      ] as LoanRepaymentSchedule[]);
      pendingRepayments = [400, 500].map(
        (amount, index) =>
          ({
            id: `repayment-${index}`,
            amount,
            collectionDate: '2026-08-28',
            createdAt: new Date(`2026-08-28T1${index}:00:00Z`),
          }) as Repayment,
      );

      await service.postOverdueChargesForLoan(loan.id, '2026-08-29');

      expect(ledgerEntries).toHaveLength(1);
    });

    it('projects an existing savings-backed Friday payment before cutoff', async () => {
      const loan = createLoan({ weeklyPaymentAmount: 1_000, savings: 300 });
      loanRepository.findOne.mockResolvedValue(loan);
      scheduleRepository.find.mockResolvedValue([
        {
          id: 'schedule-1',
          dueDate: '2026-08-23',
          amountDue: 1_000,
          amountPaid: 0,
        },
        {
          id: 'schedule-2',
          dueDate: '2026-08-30',
          amountDue: 1_000,
          amountPaid: 0,
        },
      ] as LoanRepaymentSchedule[]);
      pendingRepayments = [
        {
          id: 'repayment-1',
          amount: 700,
          useSavings: true,
          collectionDate: '2026-08-28',
          createdAt: new Date('2026-08-28T15:00:00Z'),
        } as Repayment,
      ];

      await service.postOverdueChargesForLoan(loan.id, '2026-08-29');

      expect(ledgerEntries).toHaveLength(0);
    });

    it('replaces weekly penalties with maturity charges based on remaining principal', async () => {
      const loan = createLoan({
        weeklyPaymentAmount: 1_100,
        amountPaid: 1_700,
      });
      const schedules = [
        {
          id: 'schedule-1',
          loanId: loan.id,
          weekNumber: 1,
          dueDate: '2026-08-02',
          amountDue: 1_100,
          amountPaid: 1_100,
          principalDue: 1_000,
          interestDue: 100,
        },
        {
          id: 'schedule-2',
          loanId: loan.id,
          weekNumber: 2,
          dueDate: '2026-08-09',
          amountDue: 1_100,
          amountPaid: 600,
          principalDue: 1_000,
          interestDue: 100,
        },
        {
          id: 'schedule-3',
          loanId: loan.id,
          weekNumber: 3,
          dueDate: '2026-08-16',
          amountDue: 1_100,
          amountPaid: 0,
          principalDue: 1_000,
          interestDue: 100,
        },
      ] as LoanRepaymentSchedule[];
      loanRepository.findOne.mockResolvedValue(loan);
      scheduleRepository.find.mockResolvedValue(schedules);

      await service.postOverdueChargesForLoan(loan.id, '2026-08-17');
      await service.postOverdueChargesForLoan(loan.id, '2026-08-18');

      const penaltyEntries = ledgerEntries.filter(
        (entry) => entry.chargeType === LoanChargeType.PENALTY,
      );
      const pastDueInterestEntries = ledgerEntries.filter(
        (entry) => entry.chargeType === LoanChargeType.PAST_DUE_INTEREST,
      );

      expect(penaltyEntries).toHaveLength(1);
      expect(penaltyEntries[0]).toMatchObject({
        amount: 450,
        baseAmount: 1_500,
        rate: 0.3,
        metadata: expect.objectContaining({ penaltyKind: 'maturity' }),
      });
      expect(pastDueInterestEntries).toHaveLength(2);
      expect(pastDueInterestEntries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            amount: 5,
            baseAmount: 1_500,
            periodStart: '2026-08-17',
            periodEnd: '2026-08-17',
          }),
          expect.objectContaining({
            amount: 5,
            baseAmount: 1_500,
            periodStart: '2026-08-18',
            periodEnd: '2026-08-18',
          }),
        ]),
      );
      expect(loan.penaltyAccrued).toBe(450);
      expect(loan.pastDueInterestAccrued).toBe(10);
    });

    it('starts maturity on the following Manila business date for every instant path', async () => {
      const loan = createLoan({ termWeeks: 1 });
      loanRepository.findOne.mockResolvedValue(loan);
      scheduleRepository.find.mockResolvedValue([
        {
          id: 'schedule-1',
          loanId: loan.id,
          weekNumber: 1,
          dueDate: '2026-08-30',
          amountDue: 3_300,
          amountPaid: 0,
          principalDue: 3_000,
          interestDue: 300,
        },
      ] as LoanRepaymentSchedule[]);

      await service.postOverdueChargesForLoan(
        loan.id,
        '2026-08-30T15:59:59Z',
      );
      expect(ledgerEntries).toHaveLength(0);

      await service.postOverdueChargesForLoan(
        loan.id,
        '2026-08-30T16:00:00Z',
      );

      expect(
        ledgerEntries.filter(
          (entry) => entry.chargeType === LoanChargeType.PENALTY,
        ),
      ).toHaveLength(1);
      expect(
        ledgerEntries.filter(
          (entry) => entry.chargeType === LoanChargeType.PAST_DUE_INTEREST,
        ),
      ).toHaveLength(1);
    });

    it('allocates penalty then past-due interest before principal and records reversible ledger entries', async () => {
      const loan = createLoan({
        principalAmount: 500,
        totalAmount: 500,
        weeklyPaymentAmount: 100,
        balance: 650,
        penaltyAccrued: 100,
        pastDueInterestAccrued: 50,
      });
      loanRepository.findOne.mockResolvedValue(loan);

      const result = await service.applyRepaymentWithChargeAllocation(
        loan.id,
        200,
        false,
        'repayment-1',
      );

      expect(result).toMatchObject({
        chargeApplied: 150,
        regularApplied: 50,
        totalApplied: 200,
      });
      expect(loan.penaltyPaid).toBe(100);
      expect(loan.pastDueInterestPaid).toBe(50);
      expect(loan.amountPaid).toBe(50);
      expect(loan.balance).toBe(450);
      expect(ledgerEntries.map((entry) => entry.chargeType)).toEqual([
        LoanChargeType.PENALTY,
        LoanChargeType.PAST_DUE_INTEREST,
      ]);

      const reversal =
        await service.createChargePaymentReversalsForRepayment('repayment-1');

      expect(reversal).toEqual({
        pastDueInterestAmount: 50,
        penaltyAmount: 100,
        savingsPortion: 0,
        totalAmount: 150,
      });
      expect(
        ledgerEntries.filter(
          (entry) =>
            entry.eventType === LoanChargeLedgerEventType.PAYMENT_REVERSAL,
        ),
      ).toHaveLength(2);
    });

    it('preserves penalty and past-due-interest waiver accounting', async () => {
      const loan = createLoan({
        balance: 3_450,
        penaltyAccrued: 100,
        pastDueInterestAccrued: 50,
      });
      loanRepository.findOne.mockResolvedValue(loan);

      const result = await service.applyWaiver(
        loan.id,
        { penaltyWaiver: 40, pastDueInterestWaiver: 20 },
        'manager-1',
      );

      expect(loan.penaltyWaived).toBe(40);
      expect(loan.pastDueInterestWaived).toBe(20);
      expect(result.penaltyOutstanding).toBe(60);
      expect(result.pastDueInterestOutstanding).toBe(30);
      expect(waiverRepository.save).toHaveBeenCalledTimes(1);
    });
  });
});

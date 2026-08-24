import { ConfigService } from '@nestjs/config';
import { BusinessTimeService } from '../common/business-time/business-time.service';
import { Center } from '../centers/entities/center.entity';
import { Collection } from '../collections/entities/collection.entity';
import { Loan } from '../loans/loan.entity';
import { LoansService } from '../loans/loans.service';
import { Member } from '../members/entities/member.entity';
import { LoanRepaymentAllocation } from './entities/loan-repayment-allocation.entity';
import {
  LoanRepaymentSchedule,
  LoanRepaymentStatus,
} from './entities/loan-repayment-schedule.entity';
import { Repayment, RepaymentStatus } from './repayment.entity';
import { RepaymentsService } from './repayments.service';
import { DataSource, EntityManager } from 'typeorm';

describe('RepaymentsService business dates', () => {
  const businessTime = new BusinessTimeService({
    get: () => 'Asia/Manila',
  } as unknown as ConfigService);
  const service = new RepaymentsService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as DataSource,
    {} as LoansService,
    businessTime,
  );
  const internal = service as unknown as {
    normalizeCollectionDate(collectionDate?: string): string;
  };

  afterEach(() => jest.useRealTimers());

  it('defaults a missing repayment date to the current Manila date', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-28T16:30:00Z'));

    expect(internal.normalizeCollectionDate()).toBe('2026-08-29');
  });

  it('converts an offset-bearing repayment instant to its Manila date', () => {
    expect(internal.normalizeCollectionDate('2026-08-28T16:00:00Z')).toBe(
      '2026-08-29',
    );
  });
});

describe('RepaymentsService allocation reconciliation', () => {
  type AllocationInternals = {
    applyRepaymentToSchedule(params: {
      manager: EntityManager;
      loan: Loan;
      member: Member;
      center: Center;
      repayment: Repayment;
      allocationAmount: number;
      cashPortion: number;
      savingsPortion: number;
      paymentDate: string;
    }): Promise<void>;
    recordCollectionEntry(
      manager: EntityManager,
      params: {
        memberId: string;
        centerId: string;
        collectionDate: string;
        weeklyAmount: number;
        amountApplied: number;
        totalWeeksPaid: number;
      },
    ): Promise<void>;
  };

  const businessTime = new BusinessTimeService({
    get: () => 'Asia/Manila',
  } as unknown as ConfigService);
  let service: RepaymentsService;
  let loan: Loan;
  let member: Member;
  let center: Center;
  let schedules: LoanRepaymentSchedule[];
  let allocations: LoanRepaymentAllocation[];
  let collection: Collection | null;
  let manager: EntityManager;
  let internal: AllocationInternals;

  beforeEach(() => {
    center = { id: 'center-1' } as Center;
    member = { id: 'member-1', center } as Member;
    loan = {
      id: 'loan-1',
      borrower: member,
      principalAmount: 1_500,
      totalAmount: 1_500,
      weeklyPaymentAmount: 1_000,
      interestRate: 0,
      termWeeks: 2,
      amountPaid: 0,
      balance: 1_500,
      status: 'active',
    } as Loan;
    schedules = [
      {
        id: 'schedule-1',
        loanId: loan.id,
        memberId: member.id,
        centerId: center.id,
        weekNumber: 1,
        dueDate: '2026-08-23',
        amountDue: 1_000,
        principalDue: 1_000,
        interestDue: 0,
        amountPaid: 0,
        advanceApplied: 0,
        status: LoanRepaymentStatus.UNPAID,
      },
      {
        id: 'schedule-2',
        loanId: loan.id,
        memberId: member.id,
        centerId: center.id,
        weekNumber: 2,
        dueDate: '2026-08-30',
        amountDue: 500,
        principalDue: 500,
        interestDue: 0,
        amountPaid: 0,
        advanceApplied: 0,
        status: LoanRepaymentStatus.UNPAID,
      },
    ] as LoanRepaymentSchedule[];
    allocations = [];
    collection = null;

    const scheduleRepository = {
      find: jest.fn(async () => schedules),
      create: jest.fn((value) => value),
      save: jest.fn(async (values) => values),
    };
    const allocationRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (values: LoanRepaymentAllocation[]) => {
        for (const value of values) {
          const existingIndex = allocations.findIndex(
            (item) =>
              item.repaymentId === value.repaymentId &&
              item.scheduleId === value.scheduleId,
          );
          if (existingIndex >= 0) {
            allocations[existingIndex] = value;
          } else {
            allocations.push(value);
          }
        }
        return values;
      }),
    };
    const collectionRepository = {
      findOne: jest.fn(async () => collection),
      create: jest.fn((value) => ({ id: 'collection-1', ...value })),
      save: jest.fn(async (value: Collection) => {
        collection = value;
        return value;
      }),
    };
    manager = {
      getRepository: jest.fn((entity) => {
        if (entity === LoanRepaymentSchedule) return scheduleRepository;
        if (entity === LoanRepaymentAllocation) return allocationRepository;
        if (entity === Collection) return collectionRepository;
        return {};
      }),
    } as unknown as EntityManager;

    service = new RepaymentsService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      collectionRepository as never,
      scheduleRepository as never,
      allocationRepository as never,
      {} as never,
      {} as never,
      {} as DataSource,
      {} as LoansService,
      businessTime,
    );
    internal = service as unknown as AllocationInternals;
  });

  const applyToSchedule = async (repayment: Repayment, amount: number) => {
    await internal.applyRepaymentToSchedule({
      manager,
      loan,
      member,
      center,
      repayment,
      allocationAmount: amount,
      cashPortion: amount,
      savingsPortion: 0,
      paymentDate: '2026-08-21',
    });
  };

  const recordCollection = async (amount: number) => {
    await internal.recordCollectionEntry(manager, {
      memberId: member.id,
      centerId: center.id,
      collectionDate: '2026-08-21',
      weeklyAmount: 1_000,
      amountApplied: amount,
      totalWeeksPaid: 2,
    });
  };

  it('persists every peso of an overpayment through schedules, advance, and collection', async () => {
    const repayment = {
      id: 'repayment-1',
      amount: 2_000,
      status: RepaymentStatus.APPROVED,
    } as Repayment;

    await applyToSchedule(repayment, 2_000);
    await recordCollection(2_000);

    const scheduled = schedules.reduce(
      (sum, schedule) => sum + Number(schedule.amountPaid),
      0,
    );
    const advance = schedules.reduce(
      (sum, schedule) => sum + Number(schedule.advanceApplied),
      0,
    );
    const allocated = allocations.reduce(
      (sum, allocation) => sum + Number(allocation.amountApplied),
      0,
    );

    expect(scheduled).toBe(1_500);
    expect(advance).toBe(500);
    expect(allocated).toBe(2_000);
    expect(Number(collection?.paymentReceived)).toBe(2_000);
    expect(Number(repayment.amount)).toBe(allocated);
    expect(Number(repayment.amount)).toBe(Number(collection?.paymentReceived));
  });

  it('accounts for the serialized second-payment residual as advance', async () => {
    const first = {
      id: 'repayment-1',
      amount: 1_000,
      status: RepaymentStatus.APPROVED,
    } as Repayment;
    const second = {
      id: 'repayment-2',
      amount: 1_000,
      status: RepaymentStatus.APPROVED,
    } as Repayment;

    await applyToSchedule(first, 1_000);
    await recordCollection(1_000);
    await applyToSchedule(second, 1_000);
    await recordCollection(1_000);

    const allocationFor = (repaymentId: string) =>
      allocations
        .filter((allocation) => allocation.repaymentId === repaymentId)
        .reduce((sum, allocation) => sum + Number(allocation.amountApplied), 0);

    expect(allocationFor(first.id)).toBe(1_000);
    expect(allocationFor(second.id)).toBe(1_000);
    expect(Number(schedules[1].amountPaid)).toBe(500);
    expect(Number(schedules[1].advanceApplied)).toBe(500);
    expect(Number(collection?.paymentReceived)).toBe(2_000);
  });
});

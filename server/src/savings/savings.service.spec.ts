/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { BadRequestException } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { Loan } from '../loans/loan.entity';
import { Member } from '../members/entities/member.entity';
import { Savings } from './savings.entity';
import { SavingsService } from './savings.service';

interface HarnessState {
  loan: Loan;
  entries: Savings[];
}

function createHarness(initialSavings = 5000) {
  const member = { id: 'member-1' } as Member;
  let state: HarnessState = {
    loan: {
      id: 'loan-1',
      borrower: member,
      status: 'active',
      savings: initialSavings,
    } as Loan,
    entries: [],
  };
  let failLoanSave = false;
  let transactionTail = Promise.resolve();
  const lockModes: string[] = [];

  const transaction = jest.fn(
    <T>(work: (manager: EntityManager) => Promise<T>): Promise<T> => {
      const result = transactionTail.then(async () => {
        const transactionState: HarnessState = {
          loan: { ...state.loan },
          entries: [...state.entries],
        };
        const queryBuilder: any = {
          setLock: jest.fn((mode: string) => {
            lockModes.push(mode);
            return queryBuilder;
          }),
          where: jest.fn(() => queryBuilder),
          andWhere: jest.fn(() => queryBuilder),
          getOne: jest.fn(async () => transactionState.loan),
        };
        const loanRepository = {
          createQueryBuilder: jest.fn(() => queryBuilder),
          findOne: jest.fn(async () => transactionState.loan),
          save: jest.fn(async (loan: Loan) => {
            if (failLoanSave) {
              throw new Error('loan update failed');
            }
            transactionState.loan = { ...loan };
            return loan;
          }),
        };
        const savingsRepository = {
          create: jest.fn((entry: Partial<Savings>) => ({
            id: `entry-${transactionState.entries.length + 1}`,
            createdAt: new Date('2026-09-02T00:00:00.000Z'),
            updatedAt: new Date('2026-09-02T00:00:00.000Z'),
            ...entry,
          })),
          save: jest.fn(async (entry: Savings) => {
            transactionState.entries.push(entry);
            return entry;
          }),
        };
        const manager = {
          getRepository: jest.fn((entity) => {
            if (entity === Member) {
              return { findOne: jest.fn(async () => member) };
            }
            if (entity === Loan) {
              return loanRepository;
            }
            if (entity === Savings) {
              return savingsRepository;
            }
            throw new Error('Unexpected repository');
          }),
        } as unknown as EntityManager;

        const value = await work(manager);
        state = transactionState;
        return value;
      });
      transactionTail = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  );

  const loanRepository = {
    manager: { transaction },
  } as unknown as Repository<Loan>;
  const service = new SavingsService(
    {} as Repository<Savings>,
    {} as Repository<Member>,
    loanRepository,
  );

  return {
    service,
    getState: () => state,
    lockModes,
    setFailLoanSave: (value: boolean) => {
      failLoanSave = value;
    },
  };
}

describe('SavingsService', () => {
  it('atomically deposits a positive entry and updates loan.savings', async () => {
    const harness = createHarness();

    const result = await harness.service.deposit({
      memberId: 'member-1',
      loanId: 'loan-1',
      amount: 1000,
      remarks: 'Manual deposit',
    });

    expect(result.loan.savings).toBe(6000);
    expect(harness.getState().loan.savings).toBe(6000);
    expect(harness.getState().entries).toHaveLength(1);
    expect(harness.getState().entries[0].amount).toBe(1000);
    expect(harness.lockModes).toEqual(['pessimistic_write']);
  });

  it('atomically withdraws a negative entry and updates loan.savings', async () => {
    const harness = createHarness();

    const result = await harness.service.withdraw({
      memberId: 'member-1',
      loanId: 'loan-1',
      amount: 2000,
      remarks: 'Manual withdrawal',
    });

    expect(result.loan.savings).toBe(3000);
    expect(harness.getState().entries[0].amount).toBe(-2000);
  });

  it('retains the existing insufficient-savings behavior', async () => {
    const harness = createHarness();

    await expect(
      harness.service.withdraw({
        memberId: 'member-1',
        loanId: 'loan-1',
        amount: 6000,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(harness.getState().loan.savings).toBe(5000);
    expect(harness.getState().entries).toHaveLength(0);
  });

  it.each([
    ['deposit', 1000],
    ['withdraw', 1000],
  ] as const)(
    'rolls back the %s entry when the balance update fails',
    async (operation, amount) => {
      const harness = createHarness();
      harness.setFailLoanSave(true);

      await expect(
        harness.service[operation]({
          memberId: 'member-1',
          loanId: 'loan-1',
          amount,
        }),
      ).rejects.toThrow('loan update failed');
      expect(harness.getState().loan.savings).toBe(5000);
      expect(harness.getState().entries).toHaveLength(0);
    },
  );

  it('serializes two deposits without a lost update', async () => {
    const harness = createHarness();

    await Promise.all([
      harness.service.deposit({
        memberId: 'member-1',
        loanId: 'loan-1',
        amount: 1000,
      }),
      harness.service.deposit({
        memberId: 'member-1',
        loanId: 'loan-1',
        amount: 2000,
      }),
    ]);

    expect(harness.getState().loan.savings).toBe(8000);
    expect(harness.getState().entries.map((entry) => entry.amount)).toEqual([
      1000, 2000,
    ]);
  });

  it('serializes withdrawals so only one can spend the same balance', async () => {
    const harness = createHarness();

    const results = await Promise.allSettled([
      harness.service.withdraw({
        memberId: 'member-1',
        loanId: 'loan-1',
        amount: 4000,
      }),
      harness.service.withdraw({
        memberId: 'member-1',
        loanId: 'loan-1',
        amount: 4000,
      }),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    expect(harness.getState().loan.savings).toBe(1000);
    expect(harness.getState().entries).toHaveLength(1);
  });

  it('serializes a deposit and withdrawal without losing either mutation', async () => {
    const harness = createHarness();

    await Promise.all([
      harness.service.deposit({
        memberId: 'member-1',
        loanId: 'loan-1',
        amount: 1000,
      }),
      harness.service.withdraw({
        memberId: 'member-1',
        loanId: 'loan-1',
        amount: 2000,
      }),
    ]);

    expect(harness.getState().loan.savings).toBe(4000);
    expect(harness.getState().entries.map((entry) => entry.amount)).toEqual([
      1000, -2000,
    ]);
  });
});

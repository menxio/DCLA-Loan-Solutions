import { LoanAccountingService } from './loan-accounting.service';

describe('LoanAccountingService', () => {
  it('records a waiver ledger entry with normalized credit fields', async () => {
    const save = jest.fn(async (entry) => ({ id: 'ledger-1', ...entry }));
    const create = jest.fn((entry) => entry);
    const service = new LoanAccountingService({
      create,
      save,
    } as any);

    const result = await service.recordWaiverEntry({
      loanId: 'loan-1',
      afterBalance: 925,
      pastDueInterestWaived: 50,
      penaltyWaived: 25,
      totalWaived: 75,
      reason: 'Manager approved partial relief',
      createdById: 'user-1',
      referenceId: 'waiver-1',
      postedAt: new Date('2026-04-22T00:00:00.000Z'),
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        loanId: 'loan-1',
        entryType: 'waiver',
        debit: 0,
        credit: 75,
        balanceAfter: 925,
        createdById: 'user-1',
        referenceType: 'loan_waiver',
        referenceId: 'waiver-1',
      }),
    );
    expect(save).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        id: 'ledger-1',
        credit: 75,
        balanceAfter: 925,
      }),
    );
  });
});

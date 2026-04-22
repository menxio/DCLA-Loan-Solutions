import { TransactionsService } from './transactions.service';

describe('TransactionsService', () => {
  function createService() {
    const repaymentRepo = {
      createQueryBuilder: jest.fn(),
    };
    const savingsRepo = {
      createQueryBuilder: jest.fn(),
    };
    const loanAccountingService = {
      getWaiverHistory: jest.fn(),
    };

    const service = new TransactionsService(
      repaymentRepo as any,
      savingsRepo as any,
      loanAccountingService as any,
    );

    return {
      service,
      repaymentRepo,
      savingsRepo,
      loanAccountingService,
    };
  }

  it('returns waiver entries when filtering by waiver type', async () => {
    const { service, loanAccountingService } = createService();
    loanAccountingService.getWaiverHistory.mockResolvedValue([
      {
        id: 'ledger-1',
        type: 'waiver',
        amount: 75,
        direction: 'credit',
        member: {
          id: 'member-1',
          name: 'Doe, Jane',
          center: { id: 'center-1', name: 'Center A' },
        },
        loan: { id: 'loan-1', status: 'active' },
        notes: 'Penalty waived: 25.00 | Past due interest waived: 50.00',
        createdAt: '2026-04-22T01:00:00.000Z',
        source: 'loan_accounting',
      },
    ]);

    const result = await service.getHistory({
      type: 'waiver',
      page: 1,
      limit: 25,
    } as any);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        type: 'waiver',
        amount: 75,
      }),
    );
  });
});

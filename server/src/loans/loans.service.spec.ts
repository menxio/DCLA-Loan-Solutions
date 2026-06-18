import { DataSource } from 'typeorm';
import { LoansService } from './loans.service';

describe('LoansService applyWaiver', () => {
  function createService() {
    const savedLoan = {
      id: 'loan-1',
      status: 'active',
      balance: 1000,
      pastDueInterestAccrued: 100,
      pastDueInterestWaived: 0,
      penaltyAccrued: 50,
      penaltyWaived: 0,
      borrower: { id: 'member-1' },
    };

    const loanQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(savedLoan),
    };

    const loanRepository = {
      createQueryBuilder: jest.fn(() => loanQueryBuilder),
      save: jest.fn(async (loan) => ({
        ...loan,
        balance: 925,
        pastDueInterestWaived: 50,
        penaltyWaived: 25,
      })),
    };

    const waiverRepository = {
      create: jest.fn((entry) => entry),
      save: jest.fn(async (entry) => ({
        id: 'waiver-1',
        createdAt: new Date('2026-04-22T01:00:00.000Z'),
        ...entry,
      })),
    };

    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity.name === 'Loan') {
          return loanRepository;
        }
        return waiverRepository;
      }),
    };

    const loanAccountingService = {
      recordWaiverEntry: jest.fn().mockResolvedValue({ id: 'ledger-1' }),
    };

    const dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    } as unknown as DataSource;

    const service = new LoansService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      loanAccountingService as any,
      dataSource,
    );

    return {
      service,
      loanRepository,
      waiverRepository,
      loanAccountingService,
      dataSource,
    };
  }

  it('keeps the existing waiver write and also records a ledger entry', async () => {
    const {
      service,
      loanRepository,
      waiverRepository,
      loanAccountingService,
      dataSource,
    } = createService();

    const result = await service.applyWaiver(
      'loan-1',
      {
        pastDueInterestWaiver: 50,
        penaltyWaiver: 25,
        reason: 'Approved by manager',
      },
      'manager-1',
    );

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(loanRepository.save).toHaveBeenCalledTimes(1);
    expect(waiverRepository.save).toHaveBeenCalledTimes(1);
    expect(loanAccountingService.recordWaiverEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        loanId: 'loan-1',
        afterBalance: 925,
        pastDueInterestWaived: 50,
        penaltyWaived: 25,
        totalWaived: 75,
        createdById: 'manager-1',
        referenceId: 'waiver-1',
      }),
      expect.any(Object),
    );
    expect(result).toEqual(
      expect.objectContaining({
        loan: expect.objectContaining({
          id: 'loan-1',
          balance: 925,
        }),
        waiver: expect.objectContaining({
          id: 'waiver-1',
          totalWaived: 75,
        }),
        pastDueInterestOutstanding: 50,
        penaltyOutstanding: 25,
        totalOutstanding: 75,
      }),
    );
  });
});

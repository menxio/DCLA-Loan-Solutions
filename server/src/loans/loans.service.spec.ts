import { Test, TestingModule } from '@nestjs/testing';
import { LoansService } from './loans.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Loan } from './loan.entity';
import { Member } from '../members/entities/member.entity';
import { Collection } from '../collections/entities/collection.entity';
import { Savings } from '../savings/savings.entity';
import { LoanRepaymentSchedule } from '../repayments/entities/loan-repayment-schedule.entity';
import { LoanWaiver } from './entities/loan-waiver.entity';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('LoansService', () => {
  let service: LoansService;
  let loanRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    delete: jest.Mock;
  };

  const buildLoan = (
    id: string,
    status: Loan['status'],
    savings: number,
    createdAt: Date,
  ) =>
    ({
      id,
      status,
      savings,
      createdAt,
    }) as Loan;

  beforeEach(async () => {
    loanRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoansService,
        { provide: getRepositoryToken(Loan), useValue: loanRepository },
        { provide: getRepositoryToken(Member), useValue: {} },
        { provide: getRepositoryToken(Collection), useValue: {} },
        { provide: getRepositoryToken(Savings), useValue: {} },
        { provide: getRepositoryToken(LoanRepaymentSchedule), useValue: {} },
        { provide: getRepositoryToken(LoanWaiver), useValue: {} },
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

  describe('authoritative savings loan selection', () => {
    it('selects the member only active loan', async () => {
      const active = buildLoan(
        'active',
        'active',
        5000,
        new Date('2026-01-01'),
      );
      loanRepository.find.mockResolvedValueOnce([active]);

      await expect(
        service.findAuthoritativeSavingsLoanForMember('member-1'),
      ).resolves.toBe(active);
    });

    it('prefers the active loan over historical loans', async () => {
      const active = buildLoan(
        'active',
        'active',
        7000,
        new Date('2026-02-01'),
      );
      loanRepository.find.mockResolvedValueOnce([active]);

      const selected =
        await service.findAuthoritativeSavingsLoanForMember('member-1');

      expect(selected).toBe(active);
      expect(loanRepository.find).toHaveBeenCalledTimes(1);
    });

    it('follows reloan carry-forward without summing historical snapshots', async () => {
      const activeReloan = buildLoan(
        'reloan',
        'active',
        7500,
        new Date('2026-03-01'),
      );
      loanRepository.find.mockResolvedValueOnce([activeReloan]);

      const selected =
        await service.findAuthoritativeSavingsLoanForMember('member-1');

      expect(Number(selected?.savings)).toBe(7500);
      expect(loanRepository.find).toHaveBeenCalledTimes(1);
    });

    it('uses the uniquely latest historical loan when no active loan exists', async () => {
      const latest = buildLoan('latest', 'paid', 6000, new Date('2026-02-01'));
      const older = buildLoan('older', 'payoff', 5000, new Date('2026-01-01'));
      loanRepository.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([latest, older]);

      await expect(
        service.findAuthoritativeSavingsLoanForMember('member-1'),
      ).resolves.toBe(latest);
    });

    it('returns null when the member has no loans', async () => {
      loanRepository.find.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await expect(
        service.findAuthoritativeSavingsLoanForMember('member-1'),
      ).resolves.toBeNull();
    });

    it('rejects multiple active loans as ambiguous', async () => {
      loanRepository.find.mockResolvedValueOnce([
        buildLoan('active-2', 'active', 6000, new Date('2026-02-01')),
        buildLoan('active-1', 'active', 5000, new Date('2026-01-01')),
      ]);

      await expect(
        service.findAuthoritativeSavingsLoanForMember('member-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects tied latest historical loans as ambiguous', async () => {
      const createdAt = new Date('2026-02-01');
      loanRepository.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          buildLoan('loan-2', 'paid', 6000, createdAt),
          buildLoan('loan-1', 'payoff', 5000, createdAt),
        ]);

      await expect(
        service.findAuthoritativeSavingsLoanForMember('member-1'),
      ).rejects.toThrow('latest loans have the same creation time');
    });
  });

  describe('financial retention', () => {
    it('rejects destructive deletion of a persisted loan', async () => {
      loanRepository.findOne.mockResolvedValue(
        buildLoan('loan-1', 'active', 5000, new Date('2026-01-01')),
      );

      await expect(service.remove('loan-1')).rejects.toThrow(ConflictException);

      expect(loanRepository.delete).not.toHaveBeenCalled();
    });

    it('preserves the not-found behavior for loan deletion', async () => {
      loanRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('missing-loan')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

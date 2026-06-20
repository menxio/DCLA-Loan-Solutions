import { Test, TestingModule } from '@nestjs/testing';
import { LoansService } from './loans.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Loan } from './loan.entity';
import { Member } from '../members/entities/member.entity';
import { Collection } from '../collections/entities/collection.entity';
import { Savings } from '../savings/savings.entity';
import { LoanRepaymentSchedule } from '../repayments/entities/loan-repayment-schedule.entity';
import { LoanWaiver } from './entities/loan-waiver.entity';

describe('LoansService', () => {
  let service: LoansService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoansService,
        { provide: getRepositoryToken(Loan), useValue: {} },
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
});

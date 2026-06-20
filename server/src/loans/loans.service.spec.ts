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
});

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Center } from '../centers/entities/center.entity';
import { Loan } from '../loans/loan.entity';

export interface PortfolioData {
  no: number;
  centerName: string;
  amountDisbursed: number;
  outstandingCollection: number;
}

export interface PortfolioSummary {
  totalAmountDisbursed: number;
  totalOutstandingCollection: number;
  centers: PortfolioData[];
}

export interface ProjectedIncomeData {
  no: number;
  centerName: string;
  outstandingBalance: number;
  interestIncome: number;
}

export interface ProjectedIncomeSummary {
  totalOutstandingBalance: number;
  totalInterestIncome: number;
  centers: ProjectedIncomeData[];
}

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(Center)
    private readonly centerRepo: Repository<Center>,
    @InjectRepository(Loan)
    private readonly loanRepo: Repository<Loan>,
  ) {}

  async getPortfolioData(): Promise<PortfolioSummary> {
    // Fetch centers and their loans in bulk to avoid N+1 and ensure consistent aggregates
    const centers = await this.centerRepo.find({ order: { name: 'ASC' } });

    const loans = await this.loanRepo
      .createQueryBuilder('loan')
      .leftJoinAndSelect('loan.borrower', 'member')
      .leftJoinAndSelect('member.center', 'center')
      .getMany();

    const loansByCenter = new Map<string, Loan[]>();
    for (const loan of loans) {
      const centerId = (loan as any)?.borrower?.center?.id;
      if (!centerId) continue;
      if (!loansByCenter.has(centerId)) loansByCenter.set(centerId, []);
      loansByCenter.get(centerId)!.push(loan);
    }

    const portfolioData: PortfolioData[] = [];
    let totalAmountDisbursed = 0;
    let totalOutstandingCollection = 0;

    centers.forEach((center, idx) => {
      const centerLoans = loansByCenter.get(center.id) ?? [];
      const activeLoans = centerLoans.filter((l) => l.status === 'active');

      // Amount disbursed: use actual cash released if available, else principal
      const amountDisbursed = activeLoans.reduce((sum, loan) => {
        const netRelease = Number((loan as any).netCashReleased ?? 0);
        const principal = Number(loan.principalAmount || 0);
        const effective = Number.isFinite(netRelease) && netRelease > 0 ? netRelease : principal;
        return sum + effective;
      }, 0);

      // Outstanding collection: sum of balances for active loans
      const outstandingCollection = activeLoans.reduce(
        (sum, loan) => sum + Number(loan.balance || 0),
        0,
      );

      portfolioData.push({
        no: idx + 1,
        centerName: center.name,
        amountDisbursed,
        outstandingCollection,
      });

      totalAmountDisbursed += amountDisbursed;
      totalOutstandingCollection += outstandingCollection;
    });

    return {
      totalAmountDisbursed,
      totalOutstandingCollection,
      centers: portfolioData,
    };
  }

  async getProjectedIncomeData(): Promise<ProjectedIncomeSummary> {
    const centers = await this.centerRepo.find({ order: { name: 'ASC' } });

    const loans = await this.loanRepo
      .createQueryBuilder('loan')
      .leftJoinAndSelect('loan.borrower', 'member')
      .leftJoinAndSelect('member.center', 'center')
      .where('loan.status = :status', { status: 'active' })
      .getMany();

    const loansByCenter = new Map<string, Loan[]>();
    for (const loan of loans) {
      const centerId = (loan as any)?.borrower?.center?.id;
      if (!centerId) continue;
      if (!loansByCenter.has(centerId)) loansByCenter.set(centerId, []);
      loansByCenter.get(centerId)!.push(loan);
    }

    const projectedIncomeData: ProjectedIncomeData[] = [];
    let totalOutstandingBalance = 0;
    let totalInterestIncome = 0;

    centers.forEach((center, idx) => {
      const activeLoans = loansByCenter.get(center.id) ?? [];

      const outstandingBalance = activeLoans.reduce(
        (sum, loan) => sum + Number(loan.balance || 0),
        0,
      );

      // Use each loan's actual interestRate
      const interestIncome = activeLoans.reduce((sum, loan) => {
        const rate = Number(loan.interestRate || 0);
        return sum + Number(loan.balance || 0) * rate;
      }, 0);

      projectedIncomeData.push({
        no: idx + 1,
        centerName: center.name,
        outstandingBalance,
        interestIncome,
      });

      totalOutstandingBalance += outstandingBalance;
      totalInterestIncome += interestIncome;
    });

    return {
      totalOutstandingBalance,
      totalInterestIncome,
      centers: projectedIncomeData,
    };
  }
}

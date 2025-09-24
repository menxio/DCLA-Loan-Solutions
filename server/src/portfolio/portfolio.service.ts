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
    // Get all centers
    const centers = await this.centerRepo.find({
      order: { name: 'ASC' },
    });

    const portfolioData: PortfolioData[] = [];
    let totalAmountDisbursed = 0;
    let totalOutstandingCollection = 0;

    for (let i = 0; i < centers.length; i++) {
      const center = centers[i];
      
      // Get all loans for this center
      const loans = await this.loanRepo
        .createQueryBuilder('loan')
        .leftJoin('loan.borrower', 'member')
        .leftJoin('member.center', 'center')
        .where('center.id = :centerId', { centerId: center.id })
        .getMany();

      // Calculate amount disbursed (sum of principal amounts for ACTIVE loans only)
      const amountDisbursed = loans
        .filter((loan) => loan.status === 'active')
        .reduce((sum, loan) => sum + Number(loan.principalAmount), 0);

      // Calculate outstanding collection (sum of balances for active loans)
      const outstandingCollection = loans
        .filter(loan => loan.status === 'active')
        .reduce((sum, loan) => {
          return sum + Number(loan.balance);
        }, 0);

      portfolioData.push({
        no: i + 1,
        centerName: center.name,
        amountDisbursed,
        outstandingCollection,
      });

      totalAmountDisbursed += amountDisbursed;
      totalOutstandingCollection += outstandingCollection;
    }

    return {
      totalAmountDisbursed,
      totalOutstandingCollection,
      centers: portfolioData,
    };
  }

  async getProjectedIncomeData(): Promise<ProjectedIncomeSummary> {
    // Get all centers
    const centers = await this.centerRepo.find({
      order: { name: 'ASC' },
    });

    const projectedIncomeData: ProjectedIncomeData[] = [];
    let totalOutstandingBalance = 0;
    let totalInterestIncome = 0;

    for (let i = 0; i < centers.length; i++) {
      const center = centers[i];
      
      // Get all active loans for this center
      const loans = await this.loanRepo
        .createQueryBuilder('loan')
        .leftJoin('loan.borrower', 'member')
        .leftJoin('member.center', 'center')
        .where('center.id = :centerId', { centerId: center.id })
        .andWhere('loan.status = :status', { status: 'active' })
        .getMany();

      // Calculate outstanding balance (sum of balances for active loans)
      const outstandingBalance = loans.reduce((sum, loan) => {
        return sum + Number(loan.balance);
      }, 0);

      // Calculate projected interest income
      // Interest income = (Outstanding Balance * Interest Rate) / 100
      // For simplicity, we'll use a standard interest rate of 20% (0.2)
      // You can modify this logic based on your business rules
      const interestIncome = outstandingBalance * 0.2;

      projectedIncomeData.push({
        no: i + 1,
        centerName: center.name,
        outstandingBalance,
        interestIncome,
      });

      totalOutstandingBalance += outstandingBalance;
      totalInterestIncome += interestIncome;
    }

    return {
      totalOutstandingBalance,
      totalInterestIncome,
      centers: projectedIncomeData,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Center } from '../centers/entities/center.entity';
import { Loan } from '../loans/loan.entity';
import { LoanRepaymentAllocation } from '../repayments/entities/loan-repayment-allocation.entity';
import { LoanRepaymentSchedule } from '../repayments/entities/loan-repayment-schedule.entity';
import { buildLoanRepaymentBreakdown } from '../repayments/loan-repayment-schedule.utils';
import { Repayment } from '../repayments/repayment.entity';

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

export type RevenueGranularity = 'weekly' | 'monthly';

export interface RevenueDateFilter {
  month?: number;
  year?: number;
}

export interface RevenueMonthOption {
  month: number;
  year: number;
  label: string;
}

export interface ExpectedRevenuePeriodData {
  periodKey: string;
  periodLabel: string;
  expectedInterest: number;
  serviceCharge: number;
  notarialFee: number;
  totalRevenue: number;
}

export interface ExpectedRevenueSummary {
  granularity: RevenueGranularity;
  availableMonths: RevenueMonthOption[];
  totalExpectedInterest: number;
  totalServiceCharge: number;
  totalNotarialFee: number;
  totalRevenue: number;
  periods: ExpectedRevenuePeriodData[];
}

export interface ActualRevenuePeriodData {
  periodKey: string;
  periodLabel: string;
  actualCollectedInterest: number;
  serviceCharge: number;
  notarialFee: number;
  totalRevenue: number;
}

export interface ActualRevenueSummary {
  granularity: RevenueGranularity;
  availableMonths: RevenueMonthOption[];
  totalActualCollectedInterest: number;
  totalServiceCharge: number;
  totalNotarialFee: number;
  totalRevenue: number;
  periods: ActualRevenuePeriodData[];
}

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(Center)
    private readonly centerRepo: Repository<Center>,
    @InjectRepository(Loan)
    private readonly loanRepo: Repository<Loan>,
    @InjectRepository(LoanRepaymentSchedule)
    private readonly scheduleRepo: Repository<LoanRepaymentSchedule>,
    @InjectRepository(LoanRepaymentAllocation)
    private readonly allocationRepo: Repository<LoanRepaymentAllocation>,
    @InjectRepository(Repayment)
    private readonly repaymentRepo: Repository<Repayment>,
  ) {}

  private roundCurrency(value: number): number {
    return Number(value.toFixed(2));
  }

  private getOutstandingCollectionAmount(loan: Loan): number {
    return Math.max(0, Number(loan.balance || 0));
  }

  private getLoanReferenceDate(loan: Loan): Date {
    const rawDate = loan.loanCreatedDate ?? loan.createdAt ?? new Date();
    return new Date(rawDate);
  }

  private getRepaymentReferenceDate(repayment: Repayment): Date {
    const rawDate = repayment.paymentDate
      ? `${repayment.paymentDate}T00:00:00Z`
      : repayment.createdAt ?? new Date();
    return new Date(rawDate);
  }

  private getStartOfWeek(date: Date): Date {
    const normalized = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
    const day = normalized.getUTCDay();
    const delta = day === 0 ? -6 : 1 - day;
    normalized.setUTCDate(normalized.getUTCDate() + delta);
    return normalized;
  }

  private addDays(date: Date, days: number): Date {
    const nextDate = new Date(date.getTime());
    nextDate.setUTCDate(nextDate.getUTCDate() + days);
    return nextDate;
  }

  private getStartOfMonth(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }

  private getEndOfMonth(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  }

  private getDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getMonthKey(date: Date): string {
    const year = date.getUTCFullYear();
    const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
    return `${year}-${month}`;
  }

  private getMonthOption(date: Date): RevenueMonthOption {
    return {
      month: date.getUTCMonth() + 1,
      year: date.getUTCFullYear(),
      label: date.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }),
    };
  }

  private buildAvailableMonths(dates: Date[]): RevenueMonthOption[] {
    const monthMap = new Map<string, RevenueMonthOption>();

    for (const date of dates) {
      const normalizedDate = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
      );
      const key = this.getMonthKey(normalizedDate);

      if (!monthMap.has(key)) {
        monthMap.set(key, this.getMonthOption(normalizedDate));
      }
    }

    return Array.from(monthMap.values()).sort((left, right) => {
      if (left.year !== right.year) {
        return left.year - right.year;
      }

      return left.month - right.month;
    });
  }

  private getMonthBoundedWeekRange(date: Date): {
    startDate: Date;
    endDate: Date;
  } {
    const weekStart = this.getStartOfWeek(date);
    const weekEnd = this.addDays(weekStart, 6);
    const monthStart = this.getStartOfMonth(date);
    const monthEnd = this.getEndOfMonth(date);

    return {
      startDate: weekStart < monthStart ? monthStart : weekStart,
      endDate: weekEnd > monthEnd ? monthEnd : weekEnd,
    };
  }

  private getSelectedMonthRange(
    filter?: RevenueDateFilter,
  ): { startDate: Date; endDate: Date } | null {
    if (
      !filter ||
      !Number.isInteger(filter.month) ||
      !Number.isInteger(filter.year) ||
      filter.month! < 1 ||
      filter.month! > 12
    ) {
      return null;
    }

    const startDate = new Date(Date.UTC(filter.year!, filter.month! - 1, 1));
    const endDate = this.getEndOfMonth(startDate);

    return { startDate, endDate };
  }

  private isDateInRange(
    date: Date,
    range: { startDate: Date; endDate: Date } | null,
  ): boolean {
    if (!range) {
      return true;
    }

    const normalized = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );

    return normalized >= range.startDate && normalized <= range.endDate;
  }

  private getMonthWeekPeriodKeys(range: {
    startDate: Date;
    endDate: Date;
  }): string[] {
    const periodKeys: string[] = [];
    let cursor = new Date(range.startDate.getTime());

    while (cursor <= range.endDate) {
      const { startDate, endDate } = this.getMonthBoundedWeekRange(cursor);
      const periodKey = `${this.getDateKey(startDate)}_${this.getDateKey(endDate)}`;

      if (!periodKeys.includes(periodKey)) {
        periodKeys.push(periodKey);
      }

      cursor = this.addDays(endDate, 1);
    }

    return periodKeys;
  }

  private getPeriodKey(date: Date, granularity: RevenueGranularity): string {
    if (granularity === 'weekly') {
      const { startDate, endDate } = this.getMonthBoundedWeekRange(date);
      return `${this.getDateKey(startDate)}_${this.getDateKey(endDate)}`;
    }

    const year = date.getUTCFullYear();
    const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
    return `${year}-${month}`;
  }

  private getPeriodLabel(
    periodKey: string,
    granularity: RevenueGranularity,
  ): string {
    if (granularity === 'weekly') {
      const [startKey, endKey] = periodKey.split('_');
      const startDate = new Date(`${startKey}T00:00:00Z`);
      const endDate = new Date(`${endKey}T00:00:00Z`);
      const startLabel = startDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
      const endLabel = endDate.toLocaleDateString('en-US', {
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });

      return `${startLabel}-${endLabel}`;
    }

    const periodDate = new Date(`${periodKey}-01T00:00:00Z`);
    return periodDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }

  async getExpectedRevenueData(
    granularity: RevenueGranularity = 'monthly',
    filter?: RevenueDateFilter,
  ): Promise<ExpectedRevenueSummary> {
    const normalizedGranularity: RevenueGranularity =
      granularity === 'weekly' ? 'weekly' : 'monthly';
    const selectedMonthRange =
      normalizedGranularity === 'weekly'
        ? this.getSelectedMonthRange(filter)
        : null;

    const [loans, schedules] = await Promise.all([
      this.loanRepo.find(),
      this.scheduleRepo.find({
        order: { dueDate: 'ASC', weekNumber: 'ASC' },
      }),
    ]);
    const availableMonths = this.buildAvailableMonths([
      ...loans.map((loan) => this.getLoanReferenceDate(loan)),
      ...schedules.map((schedule) => new Date(`${schedule.dueDate}T00:00:00Z`)),
    ]);

    const periodMap = new Map<
      string,
      Omit<ExpectedRevenuePeriodData, 'periodLabel' | 'totalRevenue'>
    >();
    const loanMap = new Map(loans.map((loan) => [loan.id, loan]));
    const breakdownCache = new Map<
      string,
      ReturnType<typeof buildLoanRepaymentBreakdown>
    >();

    const ensurePeriod = (periodKey: string) => {
      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, {
          periodKey,
          expectedInterest: 0,
          serviceCharge: 0,
          notarialFee: 0,
        });
      }

      return periodMap.get(periodKey)!;
    };

    if (selectedMonthRange) {
      for (const periodKey of this.getMonthWeekPeriodKeys(selectedMonthRange)) {
        ensurePeriod(periodKey);
      }
    }

    for (const loan of loans) {
      const releaseDate = this.getLoanReferenceDate(loan);
      if (!this.isDateInRange(releaseDate, selectedMonthRange)) {
        continue;
      }

      const periodKey = this.getPeriodKey(releaseDate, normalizedGranularity);
      const period = ensurePeriod(periodKey);

      period.serviceCharge = this.roundCurrency(
        period.serviceCharge + Number(loan.serviceCharge || 0),
      );
      period.notarialFee = this.roundCurrency(
        period.notarialFee + Number(loan.notarialFee || 0),
      );
    }

    for (const schedule of schedules) {
      const dueDate = new Date(`${schedule.dueDate}T00:00:00Z`);
      if (!this.isDateInRange(dueDate, selectedMonthRange)) {
        continue;
      }

      const periodKey = this.getPeriodKey(dueDate, normalizedGranularity);
      const period = ensurePeriod(periodKey);
      let expectedInterest = Number(schedule.interestDue || 0);

      if (expectedInterest === 0) {
        const loan = loanMap.get(schedule.loanId);
        if (loan) {
          if (!breakdownCache.has(loan.id)) {
            breakdownCache.set(loan.id, buildLoanRepaymentBreakdown(loan));
          }

          expectedInterest =
            breakdownCache.get(loan.id)?.[schedule.weekNumber - 1]
              ?.interestDue ?? 0;
        }
      }

      period.expectedInterest = this.roundCurrency(
        period.expectedInterest + expectedInterest,
      );
    }

    const periods = Array.from(periodMap.values())
      .sort((left, right) => left.periodKey.localeCompare(right.periodKey))
      .map((period) => {
        const totalRevenue = this.roundCurrency(
          period.expectedInterest + period.serviceCharge + period.notarialFee,
        );

        return {
          ...period,
          periodLabel: this.getPeriodLabel(
            period.periodKey,
            normalizedGranularity,
          ),
          totalRevenue,
        };
      });

    const totals = periods.reduce(
      (accumulator, period) => ({
        totalExpectedInterest: this.roundCurrency(
          accumulator.totalExpectedInterest + period.expectedInterest,
        ),
        totalServiceCharge: this.roundCurrency(
          accumulator.totalServiceCharge + period.serviceCharge,
        ),
        totalNotarialFee: this.roundCurrency(
          accumulator.totalNotarialFee + period.notarialFee,
        ),
        totalRevenue: this.roundCurrency(
          accumulator.totalRevenue + period.totalRevenue,
        ),
      }),
      {
        totalExpectedInterest: 0,
        totalServiceCharge: 0,
        totalNotarialFee: 0,
        totalRevenue: 0,
      },
    );

    return {
      granularity: normalizedGranularity,
      availableMonths,
      ...totals,
      periods,
    };
  }

  async getRealizedRevenueData(
    granularity: RevenueGranularity = 'monthly',
    filter?: RevenueDateFilter,
  ): Promise<ActualRevenueSummary> {
    const normalizedGranularity: RevenueGranularity =
      granularity === 'weekly' ? 'weekly' : 'monthly';
    const selectedMonthRange =
      normalizedGranularity === 'weekly'
        ? this.getSelectedMonthRange(filter)
        : null;

    const [loans, allocations] = await Promise.all([
      this.loanRepo.find(),
      this.allocationRepo.find({
        relations: ['repayment'],
        order: { createdAt: 'ASC' },
      }),
    ]);
    const availableMonths = this.buildAvailableMonths([
      ...loans.map((loan) => this.getLoanReferenceDate(loan)),
      ...allocations
        .filter((allocation) => allocation.repayment)
        .map((allocation) =>
          this.getRepaymentReferenceDate(allocation.repayment),
        ),
    ]);

    const periodMap = new Map<
      string,
      Omit<ActualRevenuePeriodData, 'periodLabel' | 'totalRevenue'>
    >();

    const ensurePeriod = (periodKey: string) => {
      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, {
          periodKey,
          actualCollectedInterest: 0,
          serviceCharge: 0,
          notarialFee: 0,
        });
      }

      return periodMap.get(periodKey)!;
    };

    if (selectedMonthRange) {
      for (const periodKey of this.getMonthWeekPeriodKeys(selectedMonthRange)) {
        ensurePeriod(periodKey);
      }
    }

    for (const loan of loans) {
      const releaseDate = this.getLoanReferenceDate(loan);
      if (!this.isDateInRange(releaseDate, selectedMonthRange)) {
        continue;
      }

      const periodKey = this.getPeriodKey(releaseDate, normalizedGranularity);
      const period = ensurePeriod(periodKey);

      period.serviceCharge = this.roundCurrency(
        period.serviceCharge + Number(loan.serviceCharge || 0),
      );
      period.notarialFee = this.roundCurrency(
        period.notarialFee + Number(loan.notarialFee || 0),
      );
    }

    for (const allocation of allocations) {
      if (!allocation.repayment) {
        continue;
      }

      const repaymentDate = this.getRepaymentReferenceDate(allocation.repayment);
      if (!this.isDateInRange(repaymentDate, selectedMonthRange)) {
        continue;
      }

      const periodKey = this.getPeriodKey(repaymentDate, normalizedGranularity);
      const period = ensurePeriod(periodKey);

      period.actualCollectedInterest = this.roundCurrency(
        period.actualCollectedInterest +
          Number(allocation.interestPortion || 0),
      );
    }

    const periods = Array.from(periodMap.values())
      .sort((left, right) => left.periodKey.localeCompare(right.periodKey))
      .map((period) => {
        const totalRevenue = this.roundCurrency(
          period.actualCollectedInterest +
            period.serviceCharge +
            period.notarialFee,
        );

        return {
          ...period,
          periodLabel: this.getPeriodLabel(
            period.periodKey,
            normalizedGranularity,
          ),
          totalRevenue,
        };
      });

    const totals = periods.reduce(
      (accumulator, period) => ({
        totalActualCollectedInterest: this.roundCurrency(
          accumulator.totalActualCollectedInterest +
            period.actualCollectedInterest,
        ),
        totalServiceCharge: this.roundCurrency(
          accumulator.totalServiceCharge + period.serviceCharge,
        ),
        totalNotarialFee: this.roundCurrency(
          accumulator.totalNotarialFee + period.notarialFee,
        ),
        totalRevenue: this.roundCurrency(
          accumulator.totalRevenue + period.totalRevenue,
        ),
      }),
      {
        totalActualCollectedInterest: 0,
        totalServiceCharge: 0,
        totalNotarialFee: 0,
        totalRevenue: 0,
      },
    );

    return {
      granularity: normalizedGranularity,
      availableMonths,
      ...totals,
      periods,
    };
  }

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

      // Outstanding collection tracks the persisted remaining loan balance.
      const outstandingCollection = activeLoans.reduce(
        (sum, loan) => sum + this.getOutstandingCollectionAmount(loan),
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

      // Use each loan's actual interestRate against principal to avoid double-counting interest
      const interestIncome = activeLoans.reduce((sum, loan) => {
        const rate = Number(loan.interestRate || 0);
        const principal = Number(loan.principalAmount || 0);
        return sum + principal * rate;
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

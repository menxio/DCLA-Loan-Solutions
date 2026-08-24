import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from './loan.entity';
import { Member } from '../members/entities/member.entity';
import { Collection } from '../collections/entities/collection.entity';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';
import { ReloanDto } from './dto/reloan.dto';
import { ApplyLoanWaiverDto } from './dto/apply-loan-waiver.dto';
import { FindMemberLoansQueryDto } from './dto/find-member-loans-query.dto';
import {
  LoanRepaymentSchedule,
  LoanRepaymentStatus,
} from '../repayments/entities/loan-repayment-schedule.entity';
import { Savings } from '../savings/savings.entity';
import { buildLoanRepaymentBreakdown } from '../repayments/loan-repayment-schedule.utils';
import { LoanWaiver } from './entities/loan-waiver.entity';
import {
  LoanChargeLedger,
  LoanChargeLedgerEventType,
  LoanChargeType,
} from './entities/loan-charge-ledger.entity';
import {
  calculateChargeOutstanding,
  calculatePastDueInterest,
  calculatePenalty,
} from './loan-charge-calculations.utils';
import { BusinessTimeService } from '../common/business-time/business-time.service';
import {
  Repayment,
  RepaymentOperationType,
  RepaymentStatus,
} from '../repayments/repayment.entity';

export interface ApplyRepaymentWithChargesResult {
  loan: Loan;
  regularApplied: number;
  chargeApplied: number;
  totalApplied: number;
  savingsUsed: number;
  regularCashPortion: number;
  regularSavingsPortion: number;
}

export interface ChargePaymentReversalResult {
  pastDueInterestAmount: number;
  penaltyAmount: number;
  savingsPortion: number;
  totalAmount: number;
}

export interface LoanChargeSweepResult {
  asOfDate: string;
  scannedCount: number;
  processedCount: number;
  failedCount: number;
  failures: Array<{ loanId: string; message: string }>;
}

@Injectable()
export class LoansService {
  private readonly pastDueMonthlyInterestRate = 0.1;
  private readonly penaltyRate = 0.3;

  constructor(
    @InjectRepository(Loan)
    private readonly loanRepository: Repository<Loan>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(Collection)
    private readonly collectionRepository: Repository<Collection>,
    @InjectRepository(Savings)
    private readonly savingsRepository: Repository<Savings>,
    @InjectRepository(LoanRepaymentSchedule)
    private readonly scheduleRepository: Repository<LoanRepaymentSchedule>,
    @InjectRepository(LoanWaiver)
    private readonly loanWaiverRepository: Repository<LoanWaiver>,
    @InjectRepository(LoanChargeLedger)
    private readonly loanChargeLedgerRepository: Repository<LoanChargeLedger>,
    @InjectRepository(Repayment)
    private readonly repaymentRepository: Repository<Repayment>,
    private readonly businessTime: BusinessTimeService,
  ) {}

  // Business logic for interest rates
  private getInterestRate(
    termWeeks: number,
    monthlyInterestRate?: number,
  ): number {
    if (termWeeks === 4) return 0.1;
    if (termWeeks === 8) return 0.2;
    if (termWeeks === 12) return 0.3;

    if (termWeeks !== 24) {
      throw new BadRequestException('termWeeks must be 4, 8, 12, or 24');
    }

    const rate = Number(monthlyInterestRate);
    if (!Number.isFinite(rate) || rate < 3.33 || rate > 10) {
      throw new BadRequestException(
        'monthlyInterestRate is required for 24-week loans and must be between 3.33 and 10',
      );
    }

    return (rate * 6) / 100;
  }

  // Calculate loan details
  private calculateLoanDetails(
    principalAmount: number,
    termWeeks: number,
    monthlyInterestRate?: number,
  ) {
    if (termWeeks !== 24 && monthlyInterestRate !== undefined) {
      throw new BadRequestException(
        'monthlyInterestRate is only allowed for 24-week loans',
      );
    }

    const interestRate = this.getInterestRate(termWeeks, monthlyInterestRate);
    const totalInterest = principalAmount * interestRate;
    const totalAmount = principalAmount + totalInterest;
    const baseWeeklyPayment = totalAmount / termWeeks;
    const roundedWeeklyPayment = Math.floor(baseWeeklyPayment / 10) * 10;
    const weeklyPaymentAmount =
      termWeeks === 12 || termWeeks === 24
        ? roundedWeeklyPayment + 10
        : roundedWeeklyPayment;

    return {
      interestRate,
      totalInterest,
      totalAmount,
      weeklyPaymentAmount,
    };
  }

  private async findLatestLoanForMember(
    borrowerId: string,
  ): Promise<Loan | null> {
    return this.loanRepository.findOne({
      where: { borrower: { id: borrowerId } },
      order: { createdAt: 'DESC' },
    });
  }

  async create(createLoanDto: CreateLoanDto): Promise<Loan> {
    const {
      borrowerId,
      principalAmount,
      termWeeks,
      savings,
      serviceCharge,
      notarialFee,
      loanCreatedDate,
      monthlyInterestRate,
    } = createLoanDto as any;

    // Check if borrower exists
    const borrower = await this.memberRepository.findOne({
      where: { id: borrowerId },
    });
    if (!borrower) {
      throw new NotFoundException(`Member #${borrowerId} not found`);
    }

    // Check if borrower has active loan
    const activeLoan = await this.loanRepository.findOne({
      where: { borrower: { id: borrowerId }, status: 'active' },
    });
    if (activeLoan) {
      throw new BadRequestException('Member already has an active loan');
    }

    // Determine if this is the borrower's first loan (no prior loans at all)
    const latestLoan = await this.findLatestLoanForMember(borrowerId);
    const isFirstLoan = !latestLoan;

    // Validate savings per business rule
    const providedSavings =
      savings !== undefined && savings !== null ? Number(savings) : undefined;
    if (
      providedSavings !== undefined &&
      (isNaN(providedSavings) || providedSavings < 0)
    ) {
      throw new BadRequestException('savings must be >= 0 when provided');
    }

    const previousSavingsTotal = latestLoan
      ? Number(latestLoan.savings || 0)
      : 0;
    const newSavingsContribution = Number(providedSavings ?? 0);

    // Validate service charge if provided
    const fee =
      serviceCharge !== undefined && serviceCharge !== null
        ? Number(serviceCharge)
        : 0;
    if (isNaN(fee) || fee < 0) {
      throw new BadRequestException('serviceCharge must be >= 0 when provided');
    }
    const legalFee =
      notarialFee !== undefined && notarialFee !== null
        ? Number(notarialFee)
        : 0;
    if (isNaN(legalFee) || legalFee < 0) {
      throw new BadRequestException('notarialFee must be >= 0 when provided');
    }
    const totalSavingsForValidation =
      previousSavingsTotal + newSavingsContribution;
    if (isFirstLoan && newSavingsContribution <= 0) {
      throw new BadRequestException(
        'Savings contribution must be greater than 0 for the first loan',
      );
    }

    // Calculate loan details (no auto-10% savings)
    const { interestRate, totalAmount, weeklyPaymentAmount } =
      this.calculateLoanDetails(
        principalAmount,
        termWeeks,
        monthlyInterestRate,
      );

    // Create loan
    const loan = this.loanRepository.create({
      borrower,
      principalAmount,
      termWeeks,
      interestRate,
      totalAmount,
      serviceCharge: fee,
      notarialFee: legalFee,
      weeklyPaymentAmount,
      balance: totalAmount,
      savings: totalSavingsForValidation,
      existingSavings: 0,
      weeksPaid: 0,
      paymentCountDisplayOffset: 1,
      amountPaid: 0,
      advancePaymentBuffer: 0,
      status: 'active',
      loanCreatedDate: this.businessTime.calendarDateToDate(
        this.businessTime.toBusinessDate(loanCreatedDate),
      ),
    });

    // Compute net cash released for all loans: principal - fee - savings (never below 0)
    const savingsForCalc = newSavingsContribution;
    const net = Number(principalAmount) - fee - legalFee - savingsForCalc;
    const netCashReleased = net > 0 ? net : 0;
    (loan as any).netCashReleased = netCashReleased;

    const savedLoan = await this.loanRepository.save(loan);

    // Reset any existing collections' paymentReceived to 0 for this member
    await this.collectionRepository.update(
      { memberId: borrowerId },
      { paymentReceived: 0 },
    );

    return savedLoan;
  }

  /**
   * Apply a repayment amount to a loan. Handles weekly payment counting and advance buffer.
   * If payment is short of weekly amount, deducts from savings to cover the difference.
   */
  async applyRepayment(
    loanId: string,
    amount: number,
    useSavings: boolean = false,
  ): Promise<Loan> {
    if (
      amount === undefined ||
      amount === null ||
      Number.isNaN(Number(amount))
    ) {
      throw new BadRequestException('Payment amount must be provided');
    }

    const cashAmount = Number(amount);
    if (cashAmount < 0) {
      throw new BadRequestException('Payment amount must be >= 0');
    }

    if (cashAmount === 0 && !useSavings) {
      throw new BadRequestException(
        'Payment amount must be greater than zero when not using savings',
      );
    }

    const loan = await this.findOne(loanId);
    if (loan.status !== 'active') {
      throw new BadRequestException('Cannot pay a non-active loan');
    }

    const weekly = Number(loan.weeklyPaymentAmount);
    const expectedPayment = Math.min(weekly, Number(loan.balance));
    const currentBuffer = Number(loan.advancePaymentBuffer || 0);
    const availableSavings = Number(loan.savings || 0);

    // If payment is short and useSavings is true, deduct from savings
    let totalPayment = cashAmount;
    let savingsUsed = 0;

    if (useSavings && cashAmount < expectedPayment) {
      const shortfall = expectedPayment - cashAmount;
      if (availableSavings <= 0) {
        throw new BadRequestException(
          'No savings available to cover the payment shortfall',
        );
      }

      const required = Math.min(shortfall, availableSavings);
      savingsUsed = required;
      totalPayment = cashAmount + required;
      totalPayment = Math.min(totalPayment, expectedPayment);
    }

    const newBuffer = currentBuffer + totalPayment;

    const newWeeksPaid = Math.floor(newBuffer / weekly);
    const remainingBuffer = newBuffer % weekly;

    loan.weeksPaid = Number(loan.weeksPaid) + newWeeksPaid;
    loan.advancePaymentBuffer = remainingBuffer;
    loan.amountPaid = Number(loan.amountPaid) + totalPayment;
    loan.balance = Math.max(0, Number(loan.balance) - totalPayment);
    loan.savings = Math.max(0, availableSavings - savingsUsed);
    loan.existingSavings = 0;

    if (loan.balance === 0) {
      loan.status = 'paid';
      loan.weeksPaid = Number(loan.termWeeks);
      loan.advancePaymentBuffer = 0;
    }

    const savedLoan = await this.loanRepository.save(loan);

    // Record savings deduction as a savings withdrawal transaction entry
    if (savingsUsed > 0) {
      const savingsEntry = this.savingsRepository.create({
        borrower: loan.borrower,
        loan,
        amount: -Math.abs(savingsUsed),
        remarks: 'Applied to repayment',
      });
      await this.savingsRepository.save(savingsEntry);
    }

    return savedLoan;
  }

  async applyRepaymentWithChargeAllocation(
    loanId: string,
    amount: number,
    useSavings: boolean,
    repaymentId: string,
  ): Promise<ApplyRepaymentWithChargesResult> {
    if (
      amount === undefined ||
      amount === null ||
      Number.isNaN(Number(amount))
    ) {
      throw new BadRequestException('Payment amount must be provided');
    }

    const cashAmount = this.roundCurrency(Number(amount));
    if (cashAmount < 0) {
      throw new BadRequestException('Payment amount must be >= 0');
    }

    const loan = await this.findOne(loanId);
    if (loan.status !== 'active') {
      throw new BadRequestException('Cannot pay a non-active loan');
    }

    const regularOutstanding = this.getRegularOutstanding(loan);
    const weekly = Number(loan.weeklyPaymentAmount || 0);
    const expectedRegularPayment =
      weekly > 0 ? Math.min(weekly, regularOutstanding) : regularOutstanding;
    const availableSavings = Number(loan.savings || 0);

    let savingsUsed = 0;
    if (useSavings && cashAmount < expectedRegularPayment) {
      const shortfall = expectedRegularPayment - cashAmount;
      if (availableSavings <= 0) {
        throw new BadRequestException(
          'No savings available to cover the payment shortfall',
        );
      }
      savingsUsed = this.roundCurrency(Math.min(shortfall, availableSavings));
    }

    let cashRemaining = cashAmount;
    let savingsRemaining = savingsUsed;
    let paymentRemaining = this.roundCurrency(cashRemaining + savingsRemaining);

    if (paymentRemaining <= 0) {
      throw new BadRequestException(
        'Payment amount must be greater than zero when not using savings',
      );
    }

    const allocateFromSources = (appliedAmount: number) => {
      const cashPortion = this.roundCurrency(
        Math.min(cashRemaining, appliedAmount),
      );
      const savingsPortion = this.roundCurrency(appliedAmount - cashPortion);
      cashRemaining = this.roundCurrency(
        Math.max(0, cashRemaining - cashPortion),
      );
      savingsRemaining = this.roundCurrency(
        Math.max(0, savingsRemaining - savingsPortion),
      );
      paymentRemaining = this.roundCurrency(
        Math.max(0, paymentRemaining - appliedAmount),
      );
      return { cashPortion, savingsPortion };
    };

    const chargeBuckets = this.getChargeOutstandingBuckets(loan);
    let penaltyApplied = 0;
    let pastDueInterestApplied = 0;

    if (paymentRemaining > 0 && chargeBuckets.penaltyOutstanding > 0) {
      penaltyApplied = this.roundCurrency(
        Math.min(chargeBuckets.penaltyOutstanding, paymentRemaining),
      );
      const source = allocateFromSources(penaltyApplied);
      await this.createLedgerEntry({
        loanId: loan.id,
        chargeType: LoanChargeType.PENALTY,
        eventType: LoanChargeLedgerEventType.PAYMENT,
        amount: penaltyApplied,
        cashPortion: source.cashPortion,
        savingsPortion: source.savingsPortion,
        sourceRepaymentId: repaymentId,
        idempotencyKey: `repayment:${repaymentId}:charge-payment:penalty`,
      });
      loan.penaltyPaid = this.roundCurrency(
        Number(loan.penaltyPaid || 0) + penaltyApplied,
      );
    }

    if (paymentRemaining > 0 && chargeBuckets.pastDueInterestOutstanding > 0) {
      pastDueInterestApplied = this.roundCurrency(
        Math.min(chargeBuckets.pastDueInterestOutstanding, paymentRemaining),
      );
      const source = allocateFromSources(pastDueInterestApplied);
      await this.createLedgerEntry({
        loanId: loan.id,
        chargeType: LoanChargeType.PAST_DUE_INTEREST,
        eventType: LoanChargeLedgerEventType.PAYMENT,
        amount: pastDueInterestApplied,
        cashPortion: source.cashPortion,
        savingsPortion: source.savingsPortion,
        sourceRepaymentId: repaymentId,
        idempotencyKey: `repayment:${repaymentId}:charge-payment:past-due-interest`,
      });
      loan.pastDueInterestPaid = this.roundCurrency(
        Number(loan.pastDueInterestPaid || 0) + pastDueInterestApplied,
      );
    }

    const regularApplied = this.roundCurrency(paymentRemaining);
    const regularSource =
      regularApplied > 0
        ? allocateFromSources(regularApplied)
        : { cashPortion: 0, savingsPortion: 0 };

    if (regularApplied > 0) {
      const currentBuffer = Number(loan.advancePaymentBuffer || 0);
      const newBuffer = currentBuffer + regularApplied;
      const newWeeksPaid = weekly > 0 ? Math.floor(newBuffer / weekly) : 0;
      const remainingBuffer = weekly > 0 ? newBuffer % weekly : 0;

      loan.weeksPaid = Number(loan.weeksPaid || 0) + newWeeksPaid;
      loan.advancePaymentBuffer = this.roundCurrency(remainingBuffer);
      loan.amountPaid = this.roundCurrency(
        Number(loan.amountPaid || 0) + regularApplied,
      );
    }

    loan.savings = this.roundCurrency(
      Math.max(0, availableSavings - savingsUsed),
    );
    loan.existingSavings = 0;
    loan.balance = this.calculateLoanBalance(loan);

    if (loan.balance === 0) {
      loan.status = 'paid';
      loan.weeksPaid = Number(loan.termWeeks);
      loan.advancePaymentBuffer = 0;
    }

    const savedLoan = await this.loanRepository.save(loan);

    if (savingsUsed > 0) {
      const savingsEntry = this.savingsRepository.create({
        borrower: loan.borrower,
        loan,
        amount: -Math.abs(savingsUsed),
        remarks: 'Applied to repayment',
      });
      await this.savingsRepository.save(savingsEntry);
    }

    const chargeApplied = this.roundCurrency(
      penaltyApplied + pastDueInterestApplied,
    );

    return {
      loan: savedLoan,
      regularApplied,
      chargeApplied,
      totalApplied: this.roundCurrency(regularApplied + chargeApplied),
      savingsUsed,
      regularCashPortion: regularSource.cashPortion,
      regularSavingsPortion: regularSource.savingsPortion,
    };
  }

  async createChargePaymentReversalsForRepayment(
    repaymentId: string,
  ): Promise<ChargePaymentReversalResult> {
    const paymentEntries = await this.loanChargeLedgerRepository.find({
      where: {
        sourceRepaymentId: repaymentId,
        eventType: LoanChargeLedgerEventType.PAYMENT,
      },
    });

    let pastDueInterestAmount = 0;
    let penaltyAmount = 0;
    let savingsPortion = 0;

    for (const entry of paymentEntries) {
      const amount = Number(entry.amount || 0);
      const reversal = await this.createLedgerEntry({
        loanId: entry.loanId,
        scheduleId: entry.scheduleId,
        chargeType: entry.chargeType,
        eventType: LoanChargeLedgerEventType.PAYMENT_REVERSAL,
        amount,
        cashPortion: Number(entry.cashPortion || 0),
        savingsPortion: Number(entry.savingsPortion || 0),
        sourceRepaymentId: repaymentId,
        reversedLedgerEntryId: entry.id,
        idempotencyKey: `repayment:${repaymentId}:charge-payment-reversal:${entry.id}`,
        metadata: {
          originalLedgerEntryId: entry.id,
        },
      });

      if (!reversal) {
        continue;
      }

      if (entry.chargeType === LoanChargeType.PAST_DUE_INTEREST) {
        pastDueInterestAmount = this.roundCurrency(
          pastDueInterestAmount + amount,
        );
      } else if (entry.chargeType === LoanChargeType.PENALTY) {
        penaltyAmount = this.roundCurrency(penaltyAmount + amount);
      }
      savingsPortion = this.roundCurrency(
        savingsPortion + Number(entry.savingsPortion || 0),
      );
    }

    return {
      pastDueInterestAmount,
      penaltyAmount,
      savingsPortion,
      totalAmount: this.roundCurrency(pastDueInterestAmount + penaltyAmount),
    };
  }

  async findAll(): Promise<Loan[]> {
    return this.loanRepository.find({
      relations: ['borrower'],
    });
  }

  async findByMember(memberId: string, query: FindMemberLoansQueryDto) {
    const { status = 'all', page = 1, limit = 10 } = query;

    const qb = this.loanRepository
      .createQueryBuilder('loan')
      .leftJoinAndSelect('loan.borrower', 'borrower')
      .where('borrower.id = :memberId', { memberId })
      .orderBy('loan.createdAt', 'DESC');

    if (status !== 'all') {
      qb.andWhere('loan.status = :status', { status });
    }

    const normalizedLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const normalizedPage = Math.max(Number(page) || 1, 1);

    qb.skip((normalizedPage - 1) * normalizedLimit).take(normalizedLimit);

    const [items, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / normalizedLimit) || 1;

    return {
      items,
      total,
      page: normalizedPage,
      limit: normalizedLimit,
      totalPages,
    };
  }

  async findOne(id: string): Promise<Loan> {
    const loan = await this.loanRepository.findOne({
      where: { id },
      relations: ['borrower'],
    });
    if (!loan) {
      throw new NotFoundException(`Loan #${id} not found`);
    }
    return loan;
  }

  private roundCurrency(value: number): number {
    return Number(value.toFixed(2));
  }

  private diffDays(startDate: Date, endDate: Date): number {
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    return Math.max(
      0,
      Math.floor(
        (endDate.getTime() - startDate.getTime()) / millisecondsPerDay,
      ),
    );
  }

  private getWeeklyPenaltyCutoffDate(dueDate: Date): Date {
    const fridayIndex = 5;
    const currentIndex = this.businessTime.calendarDayOfWeek(
      this.formatDate(dueDate),
    );
    const delta = (fridayIndex - currentIndex + 7) % 7;
    return this.addDays(dueDate, delta + 1);
  }

  private async getProjectedPaidAtCutoffBySchedule(
    loan: Loan,
    schedules: LoanRepaymentSchedule[],
  ): Promise<Map<string, number>> {
    const paidAtCutoff = new Map(
      schedules.map((schedule) => [
        schedule.id,
        Number(schedule.amountPaid || 0),
      ]),
    );
    const projectedPaid = new Map(paidAtCutoff);
    const pendingRepayments = await this.repaymentRepository.find({
      where: {
        loan: { id: loan.id },
        status: RepaymentStatus.PENDING,
        operationType: RepaymentOperationType.PAYMENT,
      },
      order: { collectionDate: 'ASC', createdAt: 'ASC' },
    });

    let pendingChargeAllocation =
      this.getChargeOutstandingBuckets(loan).totalOutstanding;
    let projectedRegularOutstanding = this.getRegularOutstanding(loan);
    let projectedSavings = Number(loan.savings || 0);
    const weeklyPaymentAmount = Number(loan.weeklyPaymentAmount || 0);
    for (const repayment of pendingRepayments) {
      const effectiveDate = this.businessTime.toBusinessDate(
        repayment.collectionDate ?? repayment.createdAt,
      );
      const cashAmount = Math.max(0, Number(repayment.amount || 0));
      const expectedRegularPayment =
        weeklyPaymentAmount > 0
          ? Math.min(weeklyPaymentAmount, projectedRegularOutstanding)
          : projectedRegularOutstanding;
      const savingsUsed = repayment.useSavings
        ? Math.min(
            Math.max(0, expectedRegularPayment - cashAmount),
            projectedSavings,
          )
        : 0;
      projectedSavings -= savingsUsed;
      let remaining = cashAmount + savingsUsed;
      const chargeApplied = Math.min(pendingChargeAllocation, remaining);
      pendingChargeAllocation -= chargeApplied;
      remaining -= chargeApplied;

      let regularApplied = 0;
      for (const schedule of schedules) {
        if (remaining <= 0) break;
        const currentProjected = projectedPaid.get(schedule.id) ?? 0;
        const shortfall = Math.max(
          0,
          Number(schedule.amountDue || 0) - currentProjected,
        );
        const applied = Math.min(shortfall, remaining);
        projectedPaid.set(schedule.id, currentProjected + applied);
        remaining -= applied;
        regularApplied += applied;

        const dueDate = this.normalizeDate(`${schedule.dueDate}T00:00:00Z`);
        const cutoffDate = this.getWeeklyPenaltyCutoffDate(dueDate);
        if (
          this.businessTime.compareCalendarDates(
            effectiveDate,
            this.formatDate(cutoffDate),
          ) < 0
        ) {
          paidAtCutoff.set(
            schedule.id,
            (paidAtCutoff.get(schedule.id) ?? 0) + applied,
          );
        }
      }
      projectedRegularOutstanding = Math.max(
        0,
        projectedRegularOutstanding - regularApplied,
      );
    }

    return paidAtCutoff;
  }

  private getWeeklyPenaltyAmount(weeklyPaymentAmount: number): number {
    if (weeklyPaymentAmount < 1000) {
      return 50;
    }

    if (weeklyPaymentAmount < 2000) {
      return 100;
    }

    return 200;
  }

  private getRemainingPrincipalFromSchedules(
    loan: Loan,
    schedules: LoanRepaymentSchedule[],
  ): number {
    const principalPaid = schedules.reduce((sum, schedule) => {
      const amountPaid = Number(schedule.amountPaid || 0);
      const interestDue = Number(schedule.interestDue || 0);
      const principalDue = Number(schedule.principalDue || 0);
      const paidTowardPrincipal = Math.min(
        principalDue,
        Math.max(0, amountPaid - interestDue),
      );

      return sum + paidTowardPrincipal;
    }, 0);

    return this.roundCurrency(
      Math.max(0, Number(loan.principalAmount || 0) - principalPaid),
    );
  }

  private getRegularOutstanding(loan: Loan): number {
    return this.roundCurrency(
      Math.max(0, Number(loan.totalAmount || 0) - Number(loan.amountPaid || 0)),
    );
  }

  private getChargeOutstandingBuckets(loan: Loan) {
    const pastDueInterestOutstanding = Math.max(
      0,
      calculateChargeOutstanding({
        accrued: loan.pastDueInterestAccrued,
        paid: loan.pastDueInterestPaid,
        waived: loan.pastDueInterestWaived,
      }),
    );
    const penaltyOutstanding = Math.max(
      0,
      calculateChargeOutstanding({
        accrued: loan.penaltyAccrued,
        paid: loan.penaltyPaid,
        waived: loan.penaltyWaived,
      }),
    );

    return {
      pastDueInterestOutstanding: this.roundCurrency(
        pastDueInterestOutstanding,
      ),
      penaltyOutstanding: this.roundCurrency(penaltyOutstanding),
      totalOutstanding: this.roundCurrency(
        pastDueInterestOutstanding + penaltyOutstanding,
      ),
    };
  }

  calculateLoanBalance(loan: Loan): number {
    const regularOutstanding = this.getRegularOutstanding(loan);
    const chargeOutstanding =
      this.getChargeOutstandingBuckets(loan).totalOutstanding;

    return this.roundCurrency(regularOutstanding + chargeOutstanding);
  }

  private getOutstandingWaiverBuckets(loan: Loan) {
    return this.getChargeOutstandingBuckets(loan);
  }

  private async createLedgerEntry(
    entry: Partial<LoanChargeLedger> & {
      loanId: string;
      chargeType: LoanChargeType;
      eventType: LoanChargeLedgerEventType;
      amount: number;
      idempotencyKey: string;
    },
  ): Promise<LoanChargeLedger | null> {
    const existing = await this.loanChargeLedgerRepository.findOne({
      where: { idempotencyKey: entry.idempotencyKey },
    });

    if (existing) {
      return null;
    }

    try {
      return await this.loanChargeLedgerRepository.save(
        this.loanChargeLedgerRepository.create({
          ...entry,
          amount: this.roundCurrency(Number(entry.amount || 0)),
          cashPortion: this.roundCurrency(Number(entry.cashPortion || 0)),
          savingsPortion: this.roundCurrency(Number(entry.savingsPortion || 0)),
          baseAmount: this.roundCurrency(Number(entry.baseAmount || 0)),
          rate: Number(entry.rate || 0),
          scheduleId: entry.scheduleId ?? null,
          sourceRepaymentId: entry.sourceRepaymentId ?? null,
          reversedLedgerEntryId: entry.reversedLedgerEntryId ?? null,
          periodStart: entry.periodStart ?? null,
          periodEnd: entry.periodEnd ?? null,
          metadata: entry.metadata ?? null,
        }),
      );
    } catch (error) {
      const duplicate = await this.loanChargeLedgerRepository.findOne({
        where: { idempotencyKey: entry.idempotencyKey },
      });
      if (duplicate) {
        return null;
      }
      throw error;
    }
  }

  async postOverdueChargesForLoan(
    loanId: string,
    asOfDateInput?: Date | string,
    sourceRepaymentId?: string,
  ): Promise<Loan> {
    const loan = await this.findOne(loanId);
    if (loan.status !== 'active') {
      return loan;
    }

    const asOfDate = this.normalizeDate(asOfDateInput);
    const asOfDateString = this.formatDate(asOfDate);
    const schedules = await this.scheduleRepository.find({
      where: { loanId: loan.id },
      order: { dueDate: 'ASC', weekNumber: 'ASC' },
    });

    if (!schedules.length) {
      return loan;
    }

    const epsilon = 0.01;
    const regularOutstanding = this.getRegularOutstanding(loan);
    if (regularOutstanding <= epsilon) {
      return loan;
    }

    const lastSchedule = schedules[schedules.length - 1];
    const maturityDate = this.normalizeDate(
      `${lastSchedule.dueDate}T00:00:00Z`,
    );
    const hasMatured = maturityDate.getTime() < asOfDate.getTime();

    if (!hasMatured) {
      const weeklyPenaltyAmount = this.getWeeklyPenaltyAmount(
        Number(loan.weeklyPaymentAmount || 0),
      );
      const projectedPaidAtCutoff =
        await this.getProjectedPaidAtCutoffBySchedule(loan, schedules);
      const weeklyPenaltySchedules = schedules.filter((schedule) => {
        const dueDate = this.normalizeDate(`${schedule.dueDate}T00:00:00Z`);
        const cutoffDate = this.getWeeklyPenaltyCutoffDate(dueDate);
        const amountDue = Number(schedule.amountDue || 0);
        const amountPaid = projectedPaidAtCutoff.get(schedule.id) ?? 0;

        return (
          schedule.id !== lastSchedule.id &&
          asOfDate.getTime() >= cutoffDate.getTime() &&
          amountPaid < amountDue - epsilon
        );
      });

      for (const schedule of weeklyPenaltySchedules) {
        const dueDate = this.normalizeDate(`${schedule.dueDate}T00:00:00Z`);
        const cutoffDate = this.getWeeklyPenaltyCutoffDate(dueDate);
        const cutoffDateString = this.formatDate(cutoffDate);
        const entry = await this.createLedgerEntry({
          loanId: loan.id,
          scheduleId: schedule.id,
          chargeType: LoanChargeType.PENALTY,
          eventType: LoanChargeLedgerEventType.ACCRUAL,
          amount: weeklyPenaltyAmount,
          baseAmount: Number(schedule.amountDue || 0),
          rate: 0,
          periodStart: cutoffDateString,
          periodEnd: cutoffDateString,
          sourceRepaymentId: sourceRepaymentId ?? null,
          idempotencyKey: `loan:${loan.id}:weekly-penalty:schedule:${schedule.id}`,
          metadata: {
            penaltyKind: 'weekly_delayed_payment',
            dueDate: schedule.dueDate,
            cutoffDate: cutoffDateString,
            weeklyPaymentAmount: Number(loan.weeklyPaymentAmount || 0),
            amountDue: Number(schedule.amountDue || 0),
            amountPaid: Number(schedule.amountPaid || 0),
          },
        });

        if (entry) {
          loan.penaltyAccrued = this.roundCurrency(
            Number(loan.penaltyAccrued || 0) + weeklyPenaltyAmount,
          );
        }
      }
    } else {
      const remainingPrincipal = this.getRemainingPrincipalFromSchedules(
        loan,
        schedules,
      );
      if (remainingPrincipal <= epsilon) {
        loan.balance = this.calculateLoanBalance(loan);
        return this.loanRepository.save(loan);
      }

      const latestPastDueEntry = await this.loanChargeLedgerRepository.findOne({
        where: {
          loanId: loan.id,
          chargeType: LoanChargeType.PAST_DUE_INTEREST,
          eventType: LoanChargeLedgerEventType.ACCRUAL,
        },
        order: { periodEnd: 'DESC', createdAt: 'DESC' },
      });
      const maturityStart = this.addDays(maturityDate, 1);
      const latestEnd = latestPastDueEntry?.periodEnd
        ? this.addDays(
            this.normalizeDate(`${latestPastDueEntry.periodEnd}T00:00:00Z`),
            1,
          )
        : maturityStart;
      const periodStart =
        latestEnd.getTime() > maturityStart.getTime()
          ? latestEnd
          : maturityStart;
      const daysPastMaturity = this.diffDays(
        periodStart,
        this.addDays(asOfDate, 1),
      );

      if (daysPastMaturity > 0) {
        const dailyRate = this.pastDueMonthlyInterestRate / 30;
        const pastDueInterestAmount = calculatePastDueInterest(
          remainingPrincipal,
          this.pastDueMonthlyInterestRate,
          daysPastMaturity,
        );

        if (pastDueInterestAmount > epsilon) {
          const periodStartString = this.formatDate(periodStart);
          const entry = await this.createLedgerEntry({
            loanId: loan.id,
            scheduleId: lastSchedule.id,
            chargeType: LoanChargeType.PAST_DUE_INTEREST,
            eventType: LoanChargeLedgerEventType.ACCRUAL,
            amount: pastDueInterestAmount,
            baseAmount: remainingPrincipal,
            rate: dailyRate,
            periodStart: periodStartString,
            periodEnd: asOfDateString,
            sourceRepaymentId: sourceRepaymentId ?? null,
            idempotencyKey: `loan:${loan.id}:maturity-past-due-interest:${periodStartString}:${asOfDateString}`,
            metadata: {
              daysPastMaturity,
              monthlyRate: this.pastDueMonthlyInterestRate,
              maturityDate: this.formatDate(maturityDate),
              principalBalanceBasis: remainingPrincipal,
            },
          });

          if (entry) {
            loan.pastDueInterestAccrued = this.roundCurrency(
              Number(loan.pastDueInterestAccrued || 0) + pastDueInterestAmount,
            );
          }
        }
      }

      const amount = calculatePenalty(remainingPrincipal, this.penaltyRate);
      if (amount > epsilon) {
        const maturityDateString = this.formatDate(maturityDate);
        const entry = await this.createLedgerEntry({
          loanId: loan.id,
          scheduleId: lastSchedule.id,
          chargeType: LoanChargeType.PENALTY,
          eventType: LoanChargeLedgerEventType.ACCRUAL,
          amount,
          baseAmount: remainingPrincipal,
          rate: this.penaltyRate,
          periodStart: maturityDateString,
          periodEnd: asOfDateString,
          sourceRepaymentId: sourceRepaymentId ?? null,
          idempotencyKey: `loan:${loan.id}:maturity-penalty`,
          metadata: {
            penaltyKind: 'maturity',
            maturityDate: maturityDateString,
            principalBalanceBasis: remainingPrincipal,
          },
        });

        if (entry) {
          loan.penaltyAccrued = this.roundCurrency(
            Number(loan.penaltyAccrued || 0) + amount,
          );
        }
      }
    }

    loan.balance = this.calculateLoanBalance(loan);
    return this.loanRepository.save(loan);
  }

  async postOverdueChargesForActiveLoans(
    asOfDateInput?: Date | string,
  ): Promise<LoanChargeSweepResult> {
    const asOfDate = this.formatDate(this.normalizeDate(asOfDateInput));
    const activeLoans = await this.loanRepository.find({
      where: { status: 'active' },
      select: { id: true },
    });
    const failures: Array<{ loanId: string; message: string }> = [];
    let processedCount = 0;

    for (const loan of activeLoans) {
      try {
        await this.postOverdueChargesForLoan(loan.id, asOfDate);
        processedCount += 1;
      } catch (error) {
        failures.push({
          loanId: loan.id,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      asOfDate,
      scannedCount: activeLoans.length,
      processedCount,
      failedCount: failures.length,
      failures,
    };
  }

  async getChargeBreakdown(loanId: string) {
    const loan = await this.findOne(loanId);
    const entries = await this.loanChargeLedgerRepository.find({
      where: { loanId },
      order: { createdAt: 'DESC' },
    });

    return {
      loanId,
      balance: Number(loan.balance || 0),
      regularOutstanding: this.getRegularOutstanding(loan),
      pastDueInterestAccrued: Number(loan.pastDueInterestAccrued || 0),
      pastDueInterestPaid: Number(loan.pastDueInterestPaid || 0),
      pastDueInterestWaived: Number(loan.pastDueInterestWaived || 0),
      penaltyAccrued: Number(loan.penaltyAccrued || 0),
      penaltyPaid: Number(loan.penaltyPaid || 0),
      penaltyWaived: Number(loan.penaltyWaived || 0),
      ...this.getChargeOutstandingBuckets(loan),
      entries: entries.map((entry) => ({
        id: entry.id,
        chargeType: entry.chargeType,
        eventType: entry.eventType,
        amount: Number(entry.amount || 0),
        cashPortion: Number(entry.cashPortion || 0),
        savingsPortion: Number(entry.savingsPortion || 0),
        baseAmount: Number(entry.baseAmount || 0),
        rate: Number(entry.rate || 0),
        periodStart: entry.periodStart,
        periodEnd: entry.periodEnd,
        sourceRepaymentId: entry.sourceRepaymentId,
        reversedLedgerEntryId: entry.reversedLedgerEntryId,
        metadata: entry.metadata,
        createdAt: entry.createdAt,
      })),
    };
  }

  async getWaiverCandidates() {
    const loans = await this.loanRepository.find({
      where: { status: 'active' },
      relations: ['borrower'],
      order: { updatedAt: 'DESC' },
    });

    return loans
      .map((loan) => ({
        id: loan.id,
        borrower: loan.borrower,
        status: loan.status,
        balance: Number(loan.balance || 0),
        pastDueInterestAccrued: Number(loan.pastDueInterestAccrued || 0),
        pastDueInterestPaid: Number(loan.pastDueInterestPaid || 0),
        pastDueInterestWaived: Number(loan.pastDueInterestWaived || 0),
        penaltyAccrued: Number(loan.penaltyAccrued || 0),
        penaltyPaid: Number(loan.penaltyPaid || 0),
        penaltyWaived: Number(loan.penaltyWaived || 0),
        ...this.getOutstandingWaiverBuckets(loan),
        updatedAt: loan.updatedAt,
      }))
      .filter((loan) => loan.totalOutstanding > 0);
  }

  async getWaiversByLoan(loanId: string): Promise<LoanWaiver[]> {
    await this.findOne(loanId);
    return this.loanWaiverRepository.find({
      where: { loanId },
      order: { createdAt: 'DESC' },
    });
  }

  async applyWaiver(loanId: string, dto: ApplyLoanWaiverDto, actorId?: string) {
    const loan = await this.findOne(loanId);
    if (loan.status !== 'active') {
      throw new BadRequestException(
        'Waiver can only be applied to active loans',
      );
    }

    const requestedPastDueInterestWaiver = Number(
      dto.pastDueInterestWaiver || 0,
    );
    const requestedPenaltyWaiver = Number(dto.penaltyWaiver || 0);

    if (requestedPastDueInterestWaiver <= 0 && requestedPenaltyWaiver <= 0) {
      throw new BadRequestException(
        'At least one waiver amount must be greater than 0',
      );
    }

    const { pastDueInterestOutstanding, penaltyOutstanding } =
      this.getOutstandingWaiverBuckets(loan);

    if (requestedPastDueInterestWaiver > pastDueInterestOutstanding) {
      throw new BadRequestException(
        `Past due interest waiver exceeds outstanding amount (${pastDueInterestOutstanding.toFixed(
          2,
        )})`,
      );
    }

    if (requestedPenaltyWaiver > penaltyOutstanding) {
      throw new BadRequestException(
        `Penalty waiver exceeds outstanding amount (${penaltyOutstanding.toFixed(2)})`,
      );
    }

    const beforeBalance = Number(loan.balance || 0);
    const totalWaived = this.roundCurrency(
      requestedPastDueInterestWaiver + requestedPenaltyWaiver,
    );

    loan.pastDueInterestWaived = this.roundCurrency(
      Number(loan.pastDueInterestWaived || 0) + requestedPastDueInterestWaiver,
    );
    loan.penaltyWaived = this.roundCurrency(
      Number(loan.penaltyWaived || 0) + requestedPenaltyWaiver,
    );
    loan.balance = this.calculateLoanBalance(loan);

    if (loan.balance === 0) {
      loan.status = 'paid';
    }

    const savedLoan = await this.loanRepository.save(loan);
    const waiver = this.loanWaiverRepository.create({
      loanId: savedLoan.id,
      pastDueInterestWaived: this.roundCurrency(requestedPastDueInterestWaiver),
      penaltyWaived: this.roundCurrency(requestedPenaltyWaiver),
      totalWaived,
      waivedById: actorId ?? null,
      reason: dto.reason?.trim() || null,
      beforeBalance: this.roundCurrency(beforeBalance),
      afterBalance: this.roundCurrency(savedLoan.balance || 0),
    });
    const savedWaiver = await this.loanWaiverRepository.save(waiver);

    return {
      loan: savedLoan,
      waiver: savedWaiver,
      ...this.getOutstandingWaiverBuckets(savedLoan),
    };
  }

  /**
   * Check eligibility given a specific loan
   */
  async eligibilityByLoan(loanId: string) {
    const loan = await this.findOne(loanId);

    // Updated eligibility requirements
    let minWeeks: number;
    switch (loan.termWeeks) {
      case 4:
        minWeeks = 2;
        break;
      case 8:
        minWeeks = 5;
        break;
      case 12:
        minWeeks = 8;
        break;
      default:
        minWeeks = Math.ceil(loan.termWeeks * 0.625); // Fallback formula (5/8 of term)
    }

    const eligible = loan.weeksPaid >= minWeeks && loan.status === 'active';
    return {
      eligible,
      minWeeksRequired: minWeeks,
      weeksPaid: loan.weeksPaid,
      termWeeks: loan.termWeeks,
    };
  }

  /**
   * Reloan flow with flat service charge and notarial fee plus Net Off / Pay Off modes.
   * - payoff: client pays old balance in cash; new principal - serviceCharge - notarialFee is released
   * - netoff: old balance is deducted from new loan principal; released = new principal - old balance - serviceCharge - notarialFee
   */
  async reloan(loanId: string, dto: ReloanDto) {
    const {
      newPrincipalAmount,
      newTermWeeks,
      mode,
      serviceCharge,
      notarialFee,
      savings,
      monthlyInterestRate,
    } = dto;
    if (newPrincipalAmount <= 0)
      throw new BadRequestException('newPrincipalAmount must be > 0');
    if (![4, 8, 12, 24].includes(newTermWeeks))
      throw new BadRequestException('newTermWeeks must be 4, 8, 12, or 24');
    if (!['payoff', 'netoff'].includes(mode))
      throw new BadRequestException('mode must be payoff or netoff');

    // Validate the term/rate before changing the existing loan state.
    this.calculateLoanDetails(
      Number(newPrincipalAmount),
      newTermWeeks,
      monthlyInterestRate,
    );

    const loan = await this.findOne(loanId);
    if (loan.status !== 'active')
      throw new BadRequestException('Only active loans can be reloaned');

    const { eligible, minWeeksRequired } = await this.eligibilityByLoan(loanId);
    if (!eligible)
      throw new BadRequestException(
        `Not eligible for reloan. Requires >= ${minWeeksRequired} weeks paid.`,
      );

    if (
      serviceCharge === undefined ||
      serviceCharge === null ||
      isNaN(Number(serviceCharge)) ||
      Number(serviceCharge) < 0
    ) {
      throw new BadRequestException(
        'serviceCharge is required and must be >= 0',
      );
    }
    const fee = Number(serviceCharge);
    const legalFee =
      notarialFee !== undefined && notarialFee !== null
        ? Number(notarialFee)
        : 0;
    if (isNaN(legalFee) || legalFee < 0) {
      throw new BadRequestException('notarialFee is required and must be >= 0');
    }
    const savingsAmount =
      savings !== undefined && savings !== null ? Number(savings) : 0;
    if (isNaN(savingsAmount) || savingsAmount < 0) {
      throw new BadRequestException('savings must be >= 0 when provided');
    }

    // Combine any accumulated savings on the old loan for carry-over.
    // Compute old remaining balance
    const oldRemaining = Number(loan.balance);

    // Close old loan - mark as completed based on mode
    loan.status = mode === 'payoff' ? 'payoff' : 'netoff';
    loan.balance = 0;
    loan.advancePaymentBuffer = 0;
    await this.loanRepository.save(loan);

    // Create the new loan
    const borrowerId = loan.borrower.id;
    const tempCreate: CreateLoanDto = {
      borrowerId,
      principalAmount: Number(newPrincipalAmount),
      termWeeks: newTermWeeks,
      savings: savingsAmount,
      serviceCharge: fee,
      notarialFee: legalFee,
      monthlyInterestRate,
    } as any;
    const newLoan = await this.create(tempCreate);

    // Reset any existing collections' paymentReceived to 0 for this member (already done in create, but being explicit)
    await this.collectionRepository.update(
      { memberId: borrowerId },
      { paymentReceived: 0 },
    );

    // Compute net cash released per mode
    let netCashReleased = 0;
    if (mode === 'payoff') {
      // Client pays old balance in cash, gets full new loan minus service charge and savings
      netCashReleased =
        Number(newPrincipalAmount) - fee - legalFee - savingsAmount;
    } else {
      // Net off: old balance is deducted from new loan; also deduct service charge, notarial fee, and savings
      netCashReleased =
        Number(newPrincipalAmount) -
        oldRemaining -
        fee -
        legalFee -
        savingsAmount;
      if (netCashReleased < 0) netCashReleased = 0; // Never negative release
    }

    // Persist net cash released on the newly created loan
    try {
      await this.loanRepository.update(newLoan.id, {
        netCashReleased: Number(netCashReleased) || 0,
      } as any);
      // reflect in object returned
      (newLoan as any).netCashReleased = Number(netCashReleased) || 0;
    } catch (e) {}

    return {
      oldLoanId: loanId,
      newLoanId: newLoan.id,
      mode,
      serviceCharge: fee,
      notarialFee: legalFee,
      savings: savingsAmount,
      oldRemaining,
      newPrincipalAmount,
      netCashReleased,
      newLoan,
      message:
        mode === 'payoff'
          ? `Pay Off: Client pays ₱${oldRemaining.toLocaleString()} cash, receives ₱${netCashReleased.toLocaleString()}`
          : `Net Off: ₱${oldRemaining.toLocaleString()} deducted from new loan, client receives ₱${netCashReleased.toLocaleString()}`,
    };
  }

  async update(id: string, updateLoanDto: UpdateLoanDto): Promise<Loan> {
    const loan = await this.findOne(id);

    // Currently no updatable fields
    return this.loanRepository.save(loan);
  }

  async updateTermWeeks(
    id: string,
    newTermWeeks: number,
    monthlyInterestRate?: number,
  ): Promise<Loan> {
    const loan = await this.findOne(id);

    if (loan.status !== 'active') {
      throw new BadRequestException(
        'Only active loans can have their term updated',
      );
    }

    if (
      Number(loan.weeksPaid || 0) > 0 ||
      Number(loan.amountPaid || 0) > 0 ||
      this.getChargeOutstandingBuckets(loan).totalOutstanding > 0 ||
      Number(loan.pastDueInterestAccrued || 0) > 0 ||
      Number(loan.penaltyAccrued || 0) > 0
    ) {
      throw new BadRequestException(
        'Cannot change term weeks after repayments or charges have been recorded',
      );
    }

    const { interestRate, totalAmount, weeklyPaymentAmount } =
      this.calculateLoanDetails(
        Number(loan.principalAmount),
        newTermWeeks,
        monthlyInterestRate,
      );

    loan.termWeeks = newTermWeeks;
    loan.interestRate = interestRate;
    loan.totalAmount = totalAmount;
    loan.weeklyPaymentAmount = weeklyPaymentAmount;
    loan.balance = totalAmount;
    loan.amountPaid = 0;
    loan.weeksPaid = 0;
    loan.advancePaymentBuffer = 0;

    await this.loanRepository.save(loan);

    const borrower = await this.memberRepository.findOne({
      where: { id: loan.borrower.id },
      relations: ['center'],
    });

    if (!borrower) {
      throw new NotFoundException(
        `Borrower #${loan.borrower.id} not found while rebuilding schedule`,
      );
    }

    await this.rebuildRepaymentSchedule(loan, borrower);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.loanRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Loan #${id} not found`);
    }
  }

  // Check if member is eligible for reloan
  async isEligibleForReloan(memberId: string): Promise<{
    eligible: boolean;
    reason?: string;
    activeLoan?: Loan;
  }> {
    const activeLoan = await this.loanRepository.findOne({
      where: { borrower: { id: memberId }, status: 'active' },
    });

    if (!activeLoan) {
      return { eligible: true };
    }

    const minWeeks = activeLoan.termWeeks === 8 ? 5 : 8;

    if (activeLoan.weeksPaid < minWeeks) {
      return {
        eligible: false,
        reason: `Need at least ${minWeeks} weeks paid (currently ${activeLoan.weeksPaid})`,
        activeLoan,
      };
    }

    return {
      eligible: false,
      reason: 'Member has active loan that needs to be paid off or net off',
      activeLoan,
    };
  }

  private normalizeDate(input: Date | string | null | undefined): Date {
    return this.businessTime.calendarDateToDate(
      this.businessTime.toBusinessDate(input),
    );
  }

  private addDays(date: Date, days: number): Date {
    return this.businessTime.calendarDateToDate(
      this.businessTime.addCalendarDays(this.formatDate(date), days),
    );
  }

  private formatDate(date: Date): string {
    return this.businessTime.dateToCalendarDate(date);
  }

  private getWeekdayIndex(day: string | null | undefined): number {
    if (!day) return -1;
    const lookup: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    return lookup[day.toLowerCase()] ?? -1;
  }

  private nextCollectionDate(
    fromDate: Date,
    collectionDay: string,
    skipIfSameWeek = false,
  ): Date {
    const base = this.normalizeDate(fromDate);
    const targetIndex = this.getWeekdayIndex(collectionDay);
    if (targetIndex < 0) return base;
    const currentIndex = this.businessTime.calendarDayOfWeek(
      this.formatDate(base),
    );
    let delta = (targetIndex - currentIndex + 7) % 7;
    if (delta === 0 && skipIfSameWeek) {
      delta = 7;
    }
    return this.addDays(base, delta);
  }

  private computeFirstDueDate(
    loan: Loan,
    member: Member,
    center: Member['center'] | null,
  ): Date {
    const baseDate = this.normalizeDate(
      loan.loanCreatedDate ?? loan.createdAt ?? new Date(),
    );
    const collectionDay =
      center?.collectionDay ?? (member as any)?.center?.collectionDay ?? null;
    const targetIndex = this.getWeekdayIndex(collectionDay);
    if (targetIndex < 0) {
      return baseDate;
    }
    const currentIndex = this.businessTime.calendarDayOfWeek(
      this.formatDate(baseDate),
    );
    let delta = (targetIndex - currentIndex + 7) % 7;
    // If loan is created on the collection day, first due is the following week
    if (delta === 0) {
      delta = 7;
    }
    return this.addDays(baseDate, delta);
  }

  private resolveScheduleStatus(
    schedule: LoanRepaymentSchedule,
    paymentDate: Date,
  ): LoanRepaymentStatus {
    const epsilon = 0.01;
    const dueAmount = Number(schedule.amountDue || 0);
    const paidAmount = Number(schedule.amountPaid || 0);

    if (paidAmount >= dueAmount - epsilon) {
      const dueDate = this.businessTime.calendarDateToDate(schedule.dueDate);
      if (dueDate.getTime() > paymentDate.getTime()) {
        return LoanRepaymentStatus.ADVANCE;
      }
      return LoanRepaymentStatus.PAID;
    }

    if (paidAmount > epsilon) {
      return LoanRepaymentStatus.PARTIAL;
    }

    return LoanRepaymentStatus.UNPAID;
  }

  private async rebuildRepaymentSchedule(
    loan: Loan,
    member: Member,
  ): Promise<void> {
    await this.scheduleRepository.delete({ loanId: loan.id });

    const termWeeks = Number(loan.termWeeks || 0);
    const weeklyDue = Number(loan.weeklyPaymentAmount || 0);
    if (termWeeks <= 0 || weeklyDue <= 0) {
      return;
    }

    const center = (member as any)?.center ?? null;
    const firstDueDate = this.computeFirstDueDate(loan, member, center);
    const schedules: LoanRepaymentSchedule[] = [];
    const breakdown = buildLoanRepaymentBreakdown(loan);

    for (let i = 0; i < termWeeks; i += 1) {
      const dueDate = this.addDays(firstDueDate, i * 7);
      const scheduleBreakdown = breakdown[i];
      schedules.push(
        this.scheduleRepository.create({
          loanId: loan.id,
          memberId: member.id,
          centerId: center?.id ?? null,
          weekNumber: i + 1,
          dueDate: this.formatDate(dueDate),
          amountDue: scheduleBreakdown?.amountDue ?? weeklyDue,
          principalDue: scheduleBreakdown?.principalDue ?? 0,
          interestDue: scheduleBreakdown?.interestDue ?? Math.max(0, weeklyDue),
          amountPaid: 0,
          status: LoanRepaymentStatus.UNPAID,
          advanceApplied: 0,
        }),
      );
    }

    await this.scheduleRepository.save(schedules);
  }
}

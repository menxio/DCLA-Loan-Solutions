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
import { ActivityLogService } from '../activity/activity-log.service';

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan)
    private readonly loanRepository: Repository<Loan>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(Collection)
    private readonly collectionRepository: Repository<Collection>,
    private readonly activityLogService: ActivityLogService,
  ) {}

  private formatMemberName(member: Member | null | undefined): string {
    if (!member) return 'Unknown Member';
    const parts = [member.firstName, member.middleName, member.lastName].filter(
      (part) => part && part.trim().length > 0,
    );
    return parts.join(' ').trim() || member.id;
  }

  // Business logic for interest rates
  private getInterestRate(termWeeks: number): number {
    return termWeeks === 8 ? 0.2 : 0.3;
  }

  // Calculate loan details
  private calculateLoanDetails(principalAmount: number, termWeeks: number) {
    const interestRate = this.getInterestRate(termWeeks);
    const totalInterest = principalAmount * interestRate;
    const totalAmount = principalAmount + totalInterest;
    const baseWeeklyPayment = totalAmount / termWeeks;
    const roundedWeeklyPayment = Math.floor(baseWeeklyPayment / 10) * 10;
    const weeklyPaymentAmount =
      termWeeks === 12 ? roundedWeeklyPayment + 10 : roundedWeeklyPayment;

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
      loanCreatedDate,
    } =
      createLoanDto as any;

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
    const totalSavingsForValidation = previousSavingsTotal + newSavingsContribution;
    if (isFirstLoan && newSavingsContribution <= 0) {
      throw new BadRequestException(
        'Savings contribution must be greater than 0 for the first loan',
      );
    }

    // Calculate loan details (no auto-10% savings)
    const { interestRate, totalAmount, weeklyPaymentAmount } =
      this.calculateLoanDetails(principalAmount, termWeeks);

    // Create loan
    const loan = this.loanRepository.create({
      borrower,
      principalAmount,
      termWeeks,
      interestRate,
      totalAmount,
      weeklyPaymentAmount,
      balance: totalAmount,
      savings: totalSavingsForValidation,
      existingSavings: 0,
      weeksPaid: 0,
      amountPaid: 0,
      advancePaymentBuffer: 0,
      status: 'active',
      loanCreatedDate: loanCreatedDate ? new Date(loanCreatedDate) : new Date(),
    });

    // Compute net cash released for all loans: principal - fee - savings (never below 0)
    const savingsForCalc = newSavingsContribution;
    const net = Number(principalAmount) - fee - savingsForCalc;
    const netCashReleased = net > 0 ? net : 0;
    (loan as any).netCashReleased = netCashReleased;

    const savedLoan = await this.loanRepository.save(loan);

    // Reset any existing collections' paymentReceived to 0 for this member
    await this.collectionRepository.update(
      { memberId: borrowerId },
      { paymentReceived: 0 }
    );

    const borrowerName = this.formatMemberName(borrower);

    await this.activityLogService.log({
      entityType: 'loan',
      entityId: savedLoan.id,
      loanId: savedLoan.id,
      memberId: borrower.id,
      centerId: borrower.centerId ?? null,
      action: 'loan_created',
      amount: Number(principalAmount),
      description: `Loan created for ${borrowerName} (${termWeeks} weeks)`,
      payload: {
        memberName: borrowerName,
        termWeeks,
        serviceCharge: fee,
        savingsContribution: newSavingsContribution,
        interestRate,
        loanCreatedDate: loan.loanCreatedDate,
      },
    });

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
    if (amount === undefined || amount === null || Number.isNaN(Number(amount))) {
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
    const currentBuffer = Number(loan.advancePaymentBuffer || 0);
    const availableSavings = Number(loan.savings || 0);

    // If payment is short and useSavings is true, deduct from savings
    let totalPayment = cashAmount;
    let savingsUsed = 0;

    if (useSavings && cashAmount < weekly) {
      const shortfall = weekly - cashAmount;
      if (availableSavings <= 0) {
        throw new BadRequestException(
          'No savings available to cover the payment shortfall',
        );
      }

      const required = Math.min(shortfall, availableSavings);
      savingsUsed = required;
      totalPayment = cashAmount + required;
      totalPayment = Math.min(totalPayment, weekly);
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
    }

    const saved = await this.loanRepository.save(loan);

    const memberName = this.formatMemberName(loan.borrower);

    await this.activityLogService.log({
      entityType: 'loan',
      entityId: loan.id,
      loanId: loan.id,
      memberId: loan.borrower?.id ?? null,
      centerId: loan.borrower?.centerId ?? null,
      action: 'repayment_applied',
      amount: totalPayment,
      description: `Repayment applied for ${memberName}${
        savingsUsed > 0 ? ' (with savings)' : ''
      }`,
      payload: {
        memberName,
        cashAmount,
        savingsUsed,
        weeksPaid: loan.weeksPaid,
        balance: loan.balance,
        useSavings,
      },
    });

    return saved;
  }

  async findAll(): Promise<Loan[]> {
    return this.loanRepository.find({
      relations: ['borrower'],
    });
  }

  async findByMember(memberId: string): Promise<Loan[]> {
    return this.loanRepository.find({
      where: { borrower: { id: memberId } },
      relations: ['borrower'],
      order: { createdAt: 'DESC' },
    });
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
   * Reloan flow with flat service charge and Net Off / Pay Off modes.
   * - payoff: client pays old balance in cash; new principal - serviceCharge is released
   * - netoff: old balance is deducted from new loan principal; released = new principal - old balance - serviceCharge
   */
  async reloan(loanId: string, dto: ReloanDto) {
    const { newPrincipalAmount, newTermWeeks, mode, serviceCharge, savings } = dto;
    if (newPrincipalAmount <= 0)
      throw new BadRequestException('newPrincipalAmount must be > 0');
    if (![4, 8, 12].includes(newTermWeeks))
      throw new BadRequestException('newTermWeeks must be 4, 8, or 12');
    if (!['payoff', 'netoff'].includes(mode))
      throw new BadRequestException('mode must be payoff or netoff');

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
    const savingsAmount = savings !== undefined && savings !== null ? Number(savings) : 0;
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
    const memberName = this.formatMemberName(loan.borrower);
    await this.activityLogService.log({
      entityType: 'loan',
      entityId: loan.id,
      loanId: loan.id,
      memberId: loan.borrower?.id ?? null,
      centerId: loan.borrower?.centerId ?? null,
      action: 'loan_closed',
      description: `Loan closed for ${memberName} via ${mode}`,
      payload: {
        memberName,
        mode,
        oldRemaining,
        savingsCarried: loan.savings,
      },
    });

    // Create the new loan
    const borrowerId = loan.borrower.id;
    const tempCreate: CreateLoanDto = {
      borrowerId,
      principalAmount: Number(newPrincipalAmount),
      termWeeks: newTermWeeks,
      savings: savingsAmount,
      serviceCharge: fee,
    } as any;
    const newLoan = await this.create(tempCreate);

    await this.activityLogService.log({
      entityType: 'loan',
      entityId: newLoan.id,
      loanId: newLoan.id,
      memberId: borrowerId,
      centerId: loan.borrower?.centerId ?? null,
      action: 'loan_reloaned',
      amount: Number(newPrincipalAmount),
      description: `Reloan processed for ${memberName} (${mode})`,
      payload: {
        memberName,
        previousLoanId: loanId,
        mode,
        serviceCharge: fee,
        savingsAmount,
      },
    });

    // Reset any existing collections' paymentReceived to 0 for this member (already done in create, but being explicit)
    await this.collectionRepository.update(
      { memberId: borrowerId },
      { paymentReceived: 0 }
    );

    // Compute net cash released per mode
    let netCashReleased = 0;
    if (mode === 'payoff') {
      // Client pays old balance in cash, gets full new loan minus service charge and savings
      netCashReleased = Number(newPrincipalAmount) - fee - savingsAmount;
    } else {
      // Net off: old balance is deducted from new loan; also deduct service charge and savings
      netCashReleased = Number(newPrincipalAmount) - oldRemaining - fee - savingsAmount;
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
}

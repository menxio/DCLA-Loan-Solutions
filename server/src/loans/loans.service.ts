import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from './loan.entity';
import { Member } from '../members/entities/member.entity';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';
import { ReloanDto } from './dto/reloan.dto';

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan)
    private readonly loanRepository: Repository<Loan>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
  ) {}

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

  async create(createLoanDto: CreateLoanDto): Promise<Loan> {
    const { borrowerId, principalAmount, termWeeks, savings } =
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
    const priorLoansCount = await this.loanRepository.count({
      where: { borrower: { id: borrowerId } },
    });
    const isFirstLoan = priorLoansCount === 0;

    // Validate savings per business rule
    const providedSavings =
      typeof savings === 'number' ? Number(savings) : undefined;
    if (isFirstLoan) {
      if (
        providedSavings === undefined ||
        isNaN(providedSavings) ||
        providedSavings <= 0
      ) {
        throw new BadRequestException(
          'Savings amount is required and must be > 0 for the first loan',
        );
      }
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
      savings: providedSavings ?? 0,
      weeksPaid: 0,
      amountPaid: 0,
      advancePaymentBuffer: 0,
      status: 'active',
    });

    return this.loanRepository.save(loan);
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
    if (amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    const loan = await this.findOne(loanId);
    if (loan.status !== 'active') {
      throw new BadRequestException('Cannot pay a non-active loan');
    }

    const weekly = Number(loan.weeklyPaymentAmount);
    const currentBuffer = Number(loan.advancePaymentBuffer || 0);
    const currentSavings = Number(loan.savings || 0);

    // If payment is short and useSavings is true, deduct from savings
    let totalPayment = amount;
    let savingsUsed = 0;

    if (useSavings && amount < weekly) {
      const shortfall = weekly - amount;
      if (currentSavings >= shortfall) {
        savingsUsed = shortfall;
        totalPayment = weekly; // Use full weekly amount
      } else {
        // Use all available savings
        savingsUsed = currentSavings;
        totalPayment = amount + currentSavings;
      }
    }

    const newBuffer = currentBuffer + totalPayment;

    const newWeeksPaid = Math.floor(newBuffer / weekly);
    const remainingBuffer = newBuffer % weekly;

    loan.weeksPaid = Number(loan.weeksPaid) + newWeeksPaid;
    loan.advancePaymentBuffer = remainingBuffer;
    loan.amountPaid = Number(loan.amountPaid) + totalPayment;
    loan.balance = Math.max(0, Number(loan.balance) - totalPayment);
    loan.savings = Math.max(0, currentSavings - savingsUsed);

    if (loan.balance === 0) {
      loan.status = 'paid';
    }

    return this.loanRepository.save(loan);
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
    const { newPrincipalAmount, newTermWeeks, mode, serviceCharge } = dto;
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
    } as any;
    const newLoan = await this.create(tempCreate);

    // Compute net cash released per mode
    let netCashReleased = 0;
    if (mode === 'payoff') {
      // Client pays old balance in cash, gets full new loan minus service charge
      netCashReleased = Number(newPrincipalAmount) - fee;
    } else {
      // Net off: old balance is deducted from new loan
      netCashReleased = Number(newPrincipalAmount) - oldRemaining - fee;
      if (netCashReleased < 0) netCashReleased = 0; // Never negative release
    }

    return {
      oldLoanId: loanId,
      newLoanId: newLoan.id,
      mode,
      serviceCharge: fee,
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

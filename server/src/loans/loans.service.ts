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

  // Calculate savings required (10% of principal)
  private getSavings(principalAmount: number): number {
    return principalAmount * 0.1;
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
    const savings = this.getSavings(principalAmount);

    return {
      interestRate,
      totalInterest,
      totalAmount,
      weeklyPaymentAmount,
      savings,
    };
  }

  async create(createLoanDto: CreateLoanDto): Promise<Loan> {
    const { borrowerId, principalAmount, termWeeks } = createLoanDto;

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

    // Calculate loan details
    const { interestRate, totalAmount, weeklyPaymentAmount, savings } =
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
      savings,
      weeksPaid: 0,
      amountPaid: 0,
      advancePaymentBuffer: 0,
      status: 'active',
    });

    return this.loanRepository.save(loan);
  }

  /**
   * Apply a repayment amount to a loan. Handles weekly payment counting and advance buffer.
   */
  async applyRepayment(loanId: string, amount: number): Promise<Loan> {
    if (amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    const loan = await this.findOne(loanId);
    if (loan.status !== 'active') {
      throw new BadRequestException('Cannot pay a non-active loan');
    }

    const weekly = Number(loan.weeklyPaymentAmount);
    const currentBuffer = Number(loan.advancePaymentBuffer || 0);
    const newBuffer = currentBuffer + amount;

    const newWeeksPaid = Math.floor(newBuffer / weekly);
    const remainingBuffer = newBuffer % weekly;

    loan.weeksPaid = Number(loan.weeksPaid) + newWeeksPaid;
    loan.advancePaymentBuffer = remainingBuffer;
    loan.amountPaid = Number(loan.amountPaid) + amount;
    loan.balance = Math.max(0, Number(loan.balance) - amount);

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
    const minWeeks = loan.termWeeks === 8 ? 5 : 8;
    const eligible = loan.weeksPaid >= minWeeks && loan.status === 'active';
    return { eligible, minWeeksRequired: minWeeks, weeksPaid: loan.weeksPaid, termWeeks: loan.termWeeks };
  }

  /**
   * Reloan flow with flat service charge and Net Off / Pay Off modes.
   * - payoff: client pays old balance in cash; new principal - serviceCharge is released
   * - netoff: old balance is deducted from new loan principal; released = new principal - old balance - serviceCharge
   */
  async reloan(loanId: string, dto: ReloanDto) {
    const { newPrincipalAmount, newTermWeeks, mode, serviceCharge } = dto;
    if (newPrincipalAmount <= 0) throw new BadRequestException('newPrincipalAmount must be > 0');
    if (![8, 12].includes(newTermWeeks)) throw new BadRequestException('newTermWeeks must be 8 or 12');
    if (!['payoff', 'netoff'].includes(mode)) throw new BadRequestException('mode must be payoff or netoff');

    const loan = await this.findOne(loanId);
    if (loan.status !== 'active') throw new BadRequestException('Only active loans can be reloaned');

    const { eligible, minWeeksRequired } = await this.eligibilityByLoan(loanId);
    if (!eligible) throw new BadRequestException(`Not eligible for reloan. Requires >= ${minWeeksRequired} weeks paid.`);

    const defaultServiceCharge = 500; // flat fee default (can be from config later)
    const fee = typeof serviceCharge === 'number' ? serviceCharge : defaultServiceCharge;

    // Compute old remaining balance
    const oldRemaining = Number(loan.balance);

    // Close old loan
    loan.status = 'paid';
    loan.balance = 0 as any;
    loan.advancePaymentBuffer = 0 as any;
    await this.loanRepository.save(loan);

    // Create the new loan using existing create calculation helpers
    const borrowerId = loan.borrower.id;
    const tempCreate: CreateLoanDto = { borrowerId, principalAmount: Number(newPrincipalAmount), termWeeks: newTermWeeks } as any;
    const newLoan = await this.create(tempCreate);

    // Compute net cash released per mode
    let netCashReleased = 0;
    if (mode === 'payoff') {
      netCashReleased = Number(newPrincipalAmount) - fee;
    } else {
      netCashReleased = Number(newPrincipalAmount) - oldRemaining - fee;
      if (netCashReleased < 0) netCashReleased = 0; // never negative release
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

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from './loan.entity';
import { Member } from '../members/entities/member.entity';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';

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
    return termWeeks === 8 ? 0.20 : 0.30;
  }

  // Calculate savings required (10% of principal)
  private getSavings(principalAmount: number): number {
    return principalAmount * 0.10;
  }

  // Calculate loan details
  private calculateLoanDetails(principalAmount: number, termWeeks: number) {
    const interestRate = this.getInterestRate(termWeeks);
    const totalInterest = principalAmount * interestRate;
    const totalAmount = principalAmount + totalInterest;
    const baseWeeklyPayment = totalAmount / termWeeks;
    const roundedWeeklyPayment = Math.floor(baseWeeklyPayment / 10) * 10;
    const weeklyPaymentAmount = termWeeks === 12 ? roundedWeeklyPayment + 10 : roundedWeeklyPayment;
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
    const borrower = await this.memberRepository.findOne({ where: { id: borrowerId } });
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
    const {
      interestRate,
      totalAmount,
      weeklyPaymentAmount,
      savings,
    } = this.calculateLoanDetails(principalAmount, termWeeks);

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
      status: 'active',
    });

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

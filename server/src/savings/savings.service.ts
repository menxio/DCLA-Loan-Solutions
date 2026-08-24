import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Savings } from './savings.entity';
import { Member } from '../members/entities/member.entity';
import { Loan } from '../loans/loan.entity';
import { DepositSavingsDto } from './dto/deposit-savings.dto';
import { WithdrawSavingsDto } from './dto/withdraw-savings.dto';

@Injectable()
export class SavingsService {
  constructor(
    @InjectRepository(Savings)
    private readonly savingsRepository: Repository<Savings>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(Loan)
    private readonly loanRepository: Repository<Loan>,
    private readonly dataSource: DataSource,
  ) {}

  private async locateLoanId(
    memberId: string,
    loanId?: string,
  ): Promise<string> {
    if (loanId) return loanId;
    const loan = await this.loanRepository.findOne({
      where: { borrower: { id: memberId }, status: 'active' },
      select: { id: true },
    });
    if (!loan) {
      throw new BadRequestException('Member has no active loan');
    }
    return loan.id;
  }

  private async lockLoanAndMember(
    manager: EntityManager,
    memberId: string,
    loanId: string,
    operation: 'deposit' | 'withdraw',
  ): Promise<{ loan: Loan; member: Member }> {
    const loanRepository = manager.getRepository(Loan);
    const locked = await loanRepository.findOne({
      where: { id: loanId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!locked) {
      throw new NotFoundException(`Loan #${loanId} not found`);
    }
    const loan = await loanRepository.findOne({
      where: { id: loanId },
      relations: ['borrower'],
    });
    const member = await manager.getRepository(Member).findOne({
      where: { id: memberId },
    });
    if (!loan) throw new NotFoundException(`Loan #${loanId} not found`);
    if (!member) throw new NotFoundException(`Member #${memberId} not found`);
    if (loan.borrower?.id !== memberId) {
      throw new BadRequestException('Loan does not belong to the member');
    }
    if (loan.status !== 'active') {
      const action = operation === 'deposit' ? 'deposit to' : 'withdraw from';
      throw new BadRequestException(`Cannot ${action} an inactive loan`);
    }
    return { loan, member };
  }

  async deposit(dto: DepositSavingsDto) {
    const { memberId, loanId, amount, remarks } = dto;
    const numericAmount = Number(amount);

    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      throw new BadRequestException('amount must be greater than 0');
    }

    const targetLoanId = await this.locateLoanId(memberId, loanId);
    return this.dataSource.transaction(async (manager) => {
      const { loan, member } = await this.lockLoanAndMember(
        manager,
        memberId,
        targetLoanId,
        'deposit',
      );
      const savingsRepository = manager.getRepository(Savings);
      const savingsEntry = savingsRepository.create({
        borrower: member,
        loan,
        amount: numericAmount,
        remarks,
      });
      const savedEntry = await savingsRepository.save(savingsEntry);
      const updatedSavings = Number(loan.savings || 0) + numericAmount;
      loan.savings = updatedSavings;
      await manager.getRepository(Loan).save(loan);

      return {
        entry: this.mapSavings(savedEntry, memberId),
        loan: { id: loan.id, savings: updatedSavings },
      };
    });
  }

  async withdraw(dto: WithdrawSavingsDto) {
    const { memberId, loanId, amount, remarks } = dto;
    const numericAmount = Number(amount);

    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      throw new BadRequestException('amount must be greater than 0');
    }

    const targetLoanId = await this.locateLoanId(memberId, loanId);
    return this.dataSource.transaction(async (manager) => {
      const { loan, member } = await this.lockLoanAndMember(
        manager,
        memberId,
        targetLoanId,
        'withdraw',
      );
      const currentSavings = Number(loan.savings || 0);
      if (numericAmount > currentSavings) {
        throw new BadRequestException(
          'Cannot withdraw more than available savings',
        );
      }
      const savingsRepository = manager.getRepository(Savings);
      const savingsEntry = savingsRepository.create({
        borrower: member,
        loan,
        amount: -numericAmount,
        remarks,
      });
      const savedEntry = await savingsRepository.save(savingsEntry);
      const updatedSavings = currentSavings - numericAmount;
      loan.savings = updatedSavings;
      await manager.getRepository(Loan).save(loan);

      return {
        entry: this.mapSavings(savedEntry, memberId),
        loan: { id: loan.id, savings: updatedSavings },
      };
    });
  }

  async findByMember(memberId: string) {
    const member = await this.memberRepository.findOne({
      where: { id: memberId },
    });
    if (!member) {
      throw new NotFoundException(`Member #${memberId} not found`);
    }

    const [entries, activeLoan] = await Promise.all([
      this.savingsRepository.find({
        where: { borrower: { id: memberId } },
        relations: ['loan', 'borrower'],
        order: { createdAt: 'DESC' },
      }),
      this.loanRepository.findOne({
        where: { borrower: { id: memberId }, status: 'active' },
      }),
    ]);

    const totalDeposits = entries.reduce(
      (sum, entry) => sum + this.toNumber(entry.amount),
      0,
    );

    return {
      entries: entries.map((entry) => this.mapSavings(entry, memberId)),
      totalDeposits,
      activeLoanSavings: activeLoan ? this.toNumber(activeLoan.savings) : 0,
      activeLoanId: activeLoan?.id ?? null,
    };
  }

  private toNumber(value: unknown): number {
    if (value === null || value === undefined) {
      return 0;
    }
    return Number(value) || 0;
  }

  private mapSavings(entry: Savings, fallbackMemberId?: string) {
    return {
      id: entry.id,
      borrowerId: entry.borrower?.id ?? fallbackMemberId ?? null,
      loanId: entry.loan?.id ?? null,
      amount: this.toNumber(entry.amount),
      remarks: entry.remarks || null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Savings } from './savings.entity';
import { Member } from '../members/entities/member.entity';
import { Loan } from '../loans/loan.entity';
import { DepositSavingsDto } from './dto/deposit-savings.dto';
import { ActivityLogService } from '../activity/activity-log.service';

@Injectable()
export class SavingsService {
  constructor(
    @InjectRepository(Savings)
    private readonly savingsRepository: Repository<Savings>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(Loan)
    private readonly loanRepository: Repository<Loan>,
    private readonly activityLogService: ActivityLogService,
  ) {}

  private formatMemberName(
    member: Pick<Member, 'firstName' | 'middleName' | 'lastName'>,
  ): string {
    const parts = [member.firstName, member.middleName, member.lastName].filter(
      (part) => part && part.trim().length > 0,
    );
    return parts.join(' ').trim();
  }

  async deposit(dto: DepositSavingsDto) {
    const { memberId, loanId, amount, remarks } = dto;
    const numericAmount = Number(amount);

    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      throw new BadRequestException('amount must be greater than 0');
    }

    const member = await this.memberRepository.findOne({
      where: { id: memberId },
    });
    if (!member) {
      throw new NotFoundException(`Member #${memberId} not found`);
    }

    let loan: Loan | null = null;
    if (loanId) {
      loan = await this.loanRepository.findOne({
        where: { id: loanId },
        relations: ['borrower'],
      });
      if (!loan) {
        throw new NotFoundException(`Loan #${loanId} not found`);
      }
      if (loan.borrower?.id !== memberId) {
        throw new BadRequestException('Loan does not belong to the member');
      }
      if (loan.status !== 'active') {
        throw new BadRequestException('Cannot deposit to an inactive loan');
      }
    } else {
      loan = await this.loanRepository.findOne({
        where: { borrower: { id: memberId }, status: 'active' },
      });
      if (!loan) {
        throw new BadRequestException('Member has no active loan');
      }
    }

    if (!loan) {
      throw new BadRequestException('Unable to resolve loan for deposit');
    }

    const memberName = this.formatMemberName(member);

    const savingsEntry = this.savingsRepository.create({
      borrower: member,
      loan: loan ?? undefined,
      amount: numericAmount,
      remarks,
    });
    const savedEntry = await this.savingsRepository.save(savingsEntry);

    // Update the active loan's savings balance
    const currentSavings = Number(loan.savings || 0);
    const updatedSavings = currentSavings + numericAmount;
    loan.savings = updatedSavings;
    await this.loanRepository.save(loan);

    await this.activityLogService.log({
      entityType: 'savings',
      entityId: savedEntry.id,
      memberId: member.id,
      centerId: member.centerId ?? null,
      loanId: loan.id,
      action: 'savings_deposit',
      amount: numericAmount,
      description: `Savings deposit by ${memberName}`,
      payload: {
        memberName,
        loanId: loan.id,
      },
    });

    return {
      entry: this.mapSavings(savedEntry, memberId),
      loan: {
        id: loan.id,
        savings: updatedSavings,
      },
    };
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



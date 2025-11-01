import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Repayment } from './repayment.entity';
import { Loan } from '../loans/loan.entity';
import { Member } from '../members/entities/member.entity';
import { Center } from '../centers/entities/center.entity';
import { Collection } from '../collections/entities/collection.entity';
import { LoansService } from '../loans/loans.service';

@Injectable()
export class RepaymentsService {
  constructor(
    @InjectRepository(Repayment)
    private readonly repaymentRepo: Repository<Repayment>,
    @InjectRepository(Loan)
    private readonly loanRepo: Repository<Loan>,
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
    @InjectRepository(Center)
    private readonly centerRepo: Repository<Center>,
    @InjectRepository(Collection)
    private readonly collectionRepo: Repository<Collection>,
    private readonly loansService: LoansService,
  ) {}

  async create(body: {
    loanId: string;
    memberId: string;
    centerId: string;
    amount: number;
    notes?: string;
    useSavings?: boolean;
  }) {
    const { loanId, memberId, centerId, amount, notes, useSavings = false } = body;

    if (amount === undefined || amount === null || Number.isNaN(Number(amount))) {
      throw new BadRequestException('Amount must be provided as a number');
    }

    if (Number(amount) < 0) {
      throw new BadRequestException('Amount must be >= 0');
    }

    if (Number(amount) === 0 && !useSavings) {
      throw new BadRequestException(
        'Amount must be > 0 when not using savings to cover the payment',
      );
    }

    const [loan, member, center] = await Promise.all([
      this.loanRepo.findOne({ where: { id: loanId }, relations: ['borrower'] }),
      this.memberRepo.findOne({ where: { id: memberId } }),
      this.centerRepo.findOne({ where: { id: centerId } }),
    ]);

    if (!loan) throw new NotFoundException('Loan not found');
    if (!member) throw new NotFoundException('Member not found');
    if (!center) throw new NotFoundException('Center not found');

    await this.loansService.applyRepayment(loanId, Number(amount), useSavings);

    // Update the collection's paymentReceived to reflect the cumulative amount paid
    const updatedLoan = await this.loanRepo.findOne({ where: { id: loanId } });
    if (updatedLoan) {
      await this.collectionRepo.update(
        { memberId, centerId },
        { paymentReceived: Number(updatedLoan.amountPaid) || 0 }
      );
    }

    const repayment = this.repaymentRepo.create({
      loan,
      member,
      center,
      amount,
      notes,
    });
    return this.repaymentRepo.save(repayment);
  }
}

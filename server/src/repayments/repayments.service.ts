import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Repayment } from './repayment.entity';
import { Loan } from '../loans/loan.entity';
import { Member } from '../members/entities/member.entity';
import { Center } from '../centers/entities/center.entity';
import {
  AdvancePaymentStatus,
  Collection,
} from '../collections/entities/collection.entity';
import { LoansService } from '../loans/loans.service';
import {
  LoanRepaymentSchedule,
  LoanRepaymentStatus,
} from './entities/loan-repayment-schedule.entity';
import { LoanRepaymentAllocation } from './entities/loan-repayment-allocation.entity';

@Injectable()
export class RepaymentsService implements OnModuleInit {
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
    @InjectRepository(LoanRepaymentSchedule)
    private readonly scheduleRepo: Repository<LoanRepaymentSchedule>,
    @InjectRepository(LoanRepaymentAllocation)
    private readonly allocationRepo: Repository<LoanRepaymentAllocation>,
    private readonly loansService: LoansService,
  ) {}

  async onModuleInit(): Promise<void> {
    const existingSchedules = await this.scheduleRepo.count();
    if (existingSchedules > 0) {
      return;
    }

    const loans = await this.loanRepo.find({
      relations: ['borrower', 'borrower.center'],
    });

    for (const loan of loans) {
      const borrower = loan.borrower;
      if (!borrower) continue;
      const center = borrower.center ?? null;
      await this.ensureLoanSchedule(loan, borrower, center);
      await this.replayExistingRepayments(loan, borrower, center);
    }
  }

  private normalizeCollectionDate(collectionDate?: string): string {
    if (collectionDate) {
      const parsed = new Date(collectionDate);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  async create(body: {
    loanId: string;
    memberId: string;
    centerId: string;
    amount: number;
    collectionDate?: string;
    notes?: string;
    useSavings?: boolean;
  }) {
    const {
      loanId,
      memberId,
      centerId,
      amount,
      collectionDate,
      notes,
      useSavings = false,
    } = body;

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
      this.loanRepo.findOne({
        where: { id: loanId },
        relations: ['borrower', 'borrower.center'],
      }),
      this.memberRepo.findOne({
        where: { id: memberId },
        relations: ['center'],
      }),
      this.centerRepo.findOne({ where: { id: centerId } }),
    ]);

    if (!loan) throw new NotFoundException('Loan not found');
    if (!member) throw new NotFoundException('Member not found');
    if (!center) throw new NotFoundException('Center not found');

    const previousAmountPaid = Number(loan.amountPaid ?? 0);

    await this.loansService.applyRepayment(loanId, Number(amount), useSavings);

    const collectionDateString = this.normalizeCollectionDate(collectionDate);

    const updatedLoan = await this.loanRepo.findOne({
      where: { id: loanId },
      relations: ['borrower', 'borrower.center'],
    });

    const targetLoan = updatedLoan ?? loan;
    await this.ensureLoanSchedule(
      targetLoan,
      member,
      center ?? member.center ?? null,
    );

    const cumulativeAmountPaid = Number(targetLoan.amountPaid) || 0;
    const newlyAppliedAmount = cumulativeAmountPaid - previousAmountPaid;

    const repayment = this.repaymentRepo.create({
      loan: targetLoan,
      member,
      center,
      amount,
      notes,
    });
    const savedRepayment = await this.repaymentRepo.save(repayment);

    if (newlyAppliedAmount > 0) {
      const cashPortion = Number(amount);
      const savingsPortion = Math.max(0, newlyAppliedAmount - cashPortion);
      await this.applyRepaymentToSchedule({
        loan: targetLoan,
        member,
        center,
        repayment: savedRepayment,
        allocationAmount: newlyAppliedAmount,
        cashPortion,
        savingsPortion,
        paymentDate: collectionDateString,
      });
    }

    await this.recordCollectionEntry({
      memberId,
      centerId,
      collectionDate: collectionDateString,
      weeklyAmount:
        Number(targetLoan.weeklyPaymentAmount) ||
        Number(loan.weeklyPaymentAmount) ||
        0,
      amountApplied: newlyAppliedAmount,
      totalWeeksPaid: Number(targetLoan.weeksPaid) || 0,
      notes,
    });

    return savedRepayment;
  }

  private parseDate(date: string): Date {
    const [year, month, day] = date.split('-').map((value) => Number(value));
    return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  }

  private addDays(date: Date, days: number): Date {
    const clone = new Date(date.getTime());
    clone.setUTCDate(clone.getUTCDate() + days);
    return clone;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
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

  private normalizeDate(input: Date | string | null | undefined): Date {
    const raw =
      typeof input === 'string'
        ? new Date(input)
        : input instanceof Date
          ? new Date(input.getTime())
          : new Date();
    return new Date(
      Date.UTC(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate()),
    );
  }

  private computeFirstDueDate(
    loan: Loan,
    member: Member | null,
    center: Center | null,
  ): Date {
    const baseDate = this.normalizeDate(
      loan.loanCreatedDate ?? loan.createdAt ?? new Date(),
    );
    const collectionDay =
      center?.collectionDay ?? member?.center?.collectionDay ?? null;
    const targetIndex = this.getWeekdayIndex(collectionDay);
    if (targetIndex < 0) {
      return baseDate;
    }
    const currentIndex = baseDate.getUTCDay();
    const delta = (targetIndex - currentIndex + 7) % 7;
    return this.addDays(baseDate, delta);
  }

  private async ensureLoanSchedule(
    loan: Loan,
    member: Member,
    center: Center | null,
  ): Promise<void> {
    const existing = await this.scheduleRepo.count({
      where: { loanId: loan.id },
    });
    if (existing > 0) {
      return;
    }

    const termWeeks = Number(loan.termWeeks || 0);
    const weeklyDue = Number(loan.weeklyPaymentAmount || 0);
    if (termWeeks <= 0 || weeklyDue <= 0) {
      return;
    }

    const firstDueDate = this.computeFirstDueDate(loan, member, center);
    const memberId = loan.borrower?.id ?? member.id;
    const centerId =
      center?.id ?? loan.borrower?.center?.id ?? member.center?.id ?? null;

    const rows: LoanRepaymentSchedule[] = [];
    for (let i = 0; i < termWeeks; i += 1) {
      const dueDate = this.formatDate(this.addDays(firstDueDate, i * 7));
      const schedule = this.scheduleRepo.create({
        loanId: loan.id,
        memberId: memberId ?? null,
        centerId: centerId ?? null,
        weekNumber: i + 1,
        dueDate,
        amountDue: weeklyDue,
        amountPaid: 0,
        status: LoanRepaymentStatus.UNPAID,
        advanceApplied: 0,
      });
      rows.push(schedule);
    }
    await this.scheduleRepo.save(rows);
  }

  private resolveScheduleStatus(
    schedule: LoanRepaymentSchedule,
    paymentDate: Date,
  ): LoanRepaymentStatus {
    const epsilon = 0.01;
    const dueAmount = Number(schedule.amountDue || 0);
    const paidAmount = Number(schedule.amountPaid || 0);
    if (paidAmount >= dueAmount - epsilon) {
      const dueDate = new Date(`${schedule.dueDate}T00:00:00Z`);
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

  private async applyRepaymentToSchedule(params: {
    loan: Loan;
    member: Member;
    center: Center | null;
    repayment: Repayment;
    allocationAmount: number;
    cashPortion: number;
    savingsPortion: number;
    paymentDate: string;
  }): Promise<void> {
    const {
      loan,
      member,
      center,
      repayment,
      allocationAmount,
      cashPortion,
      savingsPortion,
      paymentDate,
    } = params;

    const epsilon = 0.01;
    if (allocationAmount <= epsilon) {
      return;
    }

    await this.ensureLoanSchedule(loan, member, center);

    const schedules = await this.scheduleRepo.find({
      where: { loanId: loan.id },
      order: { dueDate: 'ASC', weekNumber: 'ASC' },
    });

    const paymentDateObj = new Date(`${paymentDate}T00:00:00Z`);
    let remaining = allocationAmount;
    let cashRemaining = Math.max(0, cashPortion);
    let savingsRemaining = Math.max(0, savingsPortion);
    const touched: LoanRepaymentSchedule[] = [];
    const allocations: LoanRepaymentAllocation[] = [];

    for (const schedule of schedules) {
      const due = Number(schedule.amountDue || 0);
      const paid = Number(schedule.amountPaid || 0);
      const shortfall = Math.max(0, due - paid);
      if (shortfall <= epsilon || remaining <= epsilon) {
        continue;
      }
      const applied = Math.min(shortfall, remaining);
      const cashApplied = Math.min(cashRemaining, applied);
      const savingsApplied = applied - cashApplied;
      schedule.amountPaid = Number((paid + applied).toFixed(2));
      schedule.status = this.resolveScheduleStatus(schedule, paymentDateObj);
      touched.push(schedule);
      allocations.push(
        this.allocationRepo.create({
          repaymentId: repayment.id,
          scheduleId: schedule.id,
          amountApplied: applied,
          cashPortion: cashApplied,
          savingsPortion: savingsApplied,
        }),
      );
      remaining -= applied;
      cashRemaining = Math.max(0, cashRemaining - cashApplied);
      savingsRemaining = Math.max(0, savingsRemaining - savingsApplied);
    }

    if (remaining > epsilon && schedules.length > 0) {
      const last = schedules[schedules.length - 1];
      last.advanceApplied = Number(
        (Number(last.advanceApplied || 0) + remaining).toFixed(2),
      );
      last.status = LoanRepaymentStatus.PAID;
      touched.push(last);
      allocations.push(
        this.allocationRepo.create({
          repaymentId: repayment.id,
          scheduleId: last.id,
          amountApplied: remaining,
          cashPortion: Math.min(cashRemaining, remaining),
          savingsPortion: Math.max(0, remaining - cashRemaining),
        }),
      );
      remaining = 0;
    }

    if (touched.length > 0) {
      await this.scheduleRepo.save(touched);
    }
    if (allocations.length > 0) {
      await this.allocationRepo.save(allocations);
    }
  }

  private async replayExistingRepayments(
    loan: Loan,
    member: Member,
    center: Center | null,
  ): Promise<void> {
    await this.ensureLoanSchedule(loan, member, center);
    const schedules = await this.scheduleRepo.find({
      where: { loanId: loan.id },
    });
    if (!schedules.length) return;

    const scheduleIds = schedules.map((s) => s.id);
    await this.allocationRepo.delete({ scheduleId: In(scheduleIds) });

    for (const schedule of schedules) {
      schedule.amountPaid = 0;
      schedule.advanceApplied = 0;
      schedule.status = LoanRepaymentStatus.UNPAID;
    }
    await this.scheduleRepo.save(schedules);

    const repayments = await this.repaymentRepo.find({
      where: { loan: { id: loan.id } },
      relations: ['loan'],
      order: { createdAt: 'ASC' },
    });

    for (const repayment of repayments) {
      const paymentDate = repayment.createdAt
        ? repayment.createdAt.toISOString().split('T')[0]
        : this.normalizeCollectionDate();
      await this.applyRepaymentToSchedule({
        loan,
        member,
        center,
        repayment,
        allocationAmount: Number(repayment.amount || 0),
        cashPortion: Number(repayment.amount || 0),
        savingsPortion: 0,
        paymentDate,
      });
    }
  }

  async getScheduleForLoan(loanId: string) {
    const loan = await this.loanRepo.findOne({
      where: { id: loanId },
      relations: ['borrower', 'borrower.center'],
    });
    if (!loan) {
      throw new NotFoundException('Loan not found');
    }
    const member = loan.borrower;
    if (!member) {
      throw new NotFoundException('Loan has no borrower');
    }
    const center = member.center ?? null;

    await this.ensureLoanSchedule(loan, member, center);

    return this.scheduleRepo.find({
      where: { loanId },
      order: { weekNumber: 'ASC', dueDate: 'ASC' },
    });
  }

  private async recordCollectionEntry(params: {
    memberId: string;
    centerId: string;
    collectionDate: string;
    weeklyAmount: number;
    amountApplied: number;
    totalWeeksPaid: number;
    notes?: string;
  }) {
    const {
      memberId,
      centerId,
      collectionDate,
      weeklyAmount,
      amountApplied,
      totalWeeksPaid,
      notes,
    } = params;

    const applied = Number(amountApplied || 0);
    const existing = await this.collectionRepo.findOne({
      where: { memberId, centerId, collectionDate },
    });

    if (existing) {
      existing.paymentReceived = Number(
        (Number(existing.paymentReceived || 0) + applied).toFixed(2),
      );
      existing.amount =
        Number(existing.amount || 0) > 0
          ? existing.amount
          : Number(weeklyAmount || 0);
      existing.numberOfPayments = totalWeeksPaid;
      if (notes) {
        existing.notes = notes;
      }
      await this.collectionRepo.save(existing);
      return;
    }

    const collection = this.collectionRepo.create({
      memberId,
      centerId,
      collectionDate,
      amount: weeklyAmount,
      netRelease: 0,
      paymentReceived: applied,
      isAutoGenerated: false,
      numberOfPayments: totalWeeksPaid,
      advancePaymentAmount: 0,
      advancePaymentStatus: AdvancePaymentStatus.NONE,
      notes,
    });
    await this.collectionRepo.save(collection);
  }
}

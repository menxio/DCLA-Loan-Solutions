import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  Repayment,
  RepaymentOperationType,
  RepaymentStatus,
} from './repayment.entity';
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
import { Savings } from '../savings/savings.entity';

export interface PendingRepaymentCollectionGroup {
  centerId: string;
  centerName: string;
  collectionDate: string;
  pendingCount: number;
  paymentCount: number;
  reversalCount: number;
  paymentAmount: number;
  reversalAmount: number;
  netAmount: number;
}

export interface PendingCollectionActionResult {
  centerId: string;
  collectionDate: string;
  processedCount: number;
  approvedCount?: number;
  rejectedCount?: number;
}

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
    @InjectRepository(Savings)
    private readonly savingsRepo: Repository<Savings>,
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
  }, actor?: { userId?: string; role?: string }) {
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

    const numericAmount = Number(amount);
    if (numericAmount < 0) {
      throw new BadRequestException('Amount must be >= 0');
    }

    if (numericAmount === 0 && !useSavings) {
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

    const collectionDateString = this.normalizeCollectionDate(collectionDate);
    const createdById = actor?.userId ?? null;
    const shouldAutoApprove =
      actor?.role === 'manager' || actor?.role === 'admin';

    const repayment = this.repaymentRepo.create({
      loan,
      member,
      center,
      amount: numericAmount,
      notes,
      collectionDate: collectionDateString,
      useSavings: Boolean(useSavings),
      status: RepaymentStatus.PENDING,
      operationType: RepaymentOperationType.PAYMENT,
      relatedRepaymentId: null,
      createdById,
    });
    const savedRepayment = await this.repaymentRepo.save(repayment);

    if (!shouldAutoApprove) {
      return savedRepayment;
    }

    return this.approveRepayment(savedRepayment.id, createdById ?? undefined);
  }

  async requestReversal(
    repaymentId: string,
    body: { reason?: string },
    actor?: { userId?: string; role?: string },
  ) {
    const sourceRepayment = await this.repaymentRepo.findOne({
      where: { id: repaymentId },
      relations: ['loan', 'member', 'center'],
    });

    if (!sourceRepayment) {
      throw new NotFoundException('Repayment not found');
    }

    if (sourceRepayment.operationType === RepaymentOperationType.REVERSAL) {
      throw new BadRequestException('Cannot reverse a reversal transaction');
    }

    if (sourceRepayment.status !== RepaymentStatus.APPROVED) {
      throw new BadRequestException(
        'Only approved repayments can be reversed',
      );
    }

    const existingReversal = await this.repaymentRepo.findOne({
      where: {
        relatedRepaymentId: sourceRepayment.id,
        operationType: RepaymentOperationType.REVERSAL,
        status: In([RepaymentStatus.PENDING, RepaymentStatus.APPROVED]),
      },
      order: { createdAt: 'DESC' },
    });

    if (existingReversal) {
      if (existingReversal.status === RepaymentStatus.PENDING) {
        throw new BadRequestException(
          'A reversal request is already pending approval',
        );
      }
      throw new BadRequestException('Repayment has already been reversed');
    }

    const createdById = actor?.userId ?? null;
    const shouldAutoApprove =
      actor?.role === 'manager' || actor?.role === 'admin';
    const reason = body.reason?.trim();

    const reversal = this.repaymentRepo.create({
      loan: sourceRepayment.loan,
      member: sourceRepayment.member,
      center: sourceRepayment.center,
      amount: Number(sourceRepayment.amount),
      notes:
        reason && reason.length > 0
          ? reason
          : `Reversal request for repayment ${sourceRepayment.id}`,
      collectionDate:
        sourceRepayment.collectionDate ??
        this.normalizeCollectionDate(sourceRepayment.createdAt.toISOString()),
      useSavings: false,
      status: RepaymentStatus.PENDING,
      operationType: RepaymentOperationType.REVERSAL,
      relatedRepaymentId: sourceRepayment.id,
      createdById,
    });

    const savedReversal = await this.repaymentRepo.save(reversal);

    if (!shouldAutoApprove) {
      return savedReversal;
    }

    return this.approveRepayment(savedReversal.id, createdById ?? undefined);
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
    let delta = (targetIndex - currentIndex + 7) % 7;
    // If the loan is created on the collection day, push first due date to the next week
    if (delta === 0) {
      delta = 7;
    }
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

    const approvedEntries = await this.repaymentRepo.find({
      where: { loan: { id: loan.id }, status: RepaymentStatus.APPROVED },
      relations: ['loan'],
      order: { createdAt: 'ASC' },
    });

    const reversedRepaymentIds = new Set(
      approvedEntries
        .filter(
          (entry) =>
            entry.operationType === RepaymentOperationType.REVERSAL &&
            Boolean(entry.relatedRepaymentId),
        )
        .map((entry) => entry.relatedRepaymentId as string),
    );

    const approvedPayments = approvedEntries.filter(
      (entry) =>
        entry.operationType !== RepaymentOperationType.REVERSAL &&
        !reversedRepaymentIds.has(entry.id),
    );

    for (const repayment of approvedPayments) {
      const paymentDate = this.normalizeCollectionDate(
        repayment.collectionDate ?? repayment.createdAt?.toISOString(),
      );
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

  async findPendingRepayments(): Promise<Repayment[]> {
    return this.repaymentRepo.find({
      where: { status: RepaymentStatus.PENDING },
      relations: ['loan', 'member', 'center'],
      order: { createdAt: 'DESC' },
    });
  }

  private businessDateExpression(alias: string): string {
    return `COALESCE(${alias}."collectionDate", (${alias}."createdAt" AT TIME ZONE 'UTC')::date)`;
  }

  async findPendingCollections(): Promise<PendingRepaymentCollectionGroup[]> {
    const businessDateExpr = this.businessDateExpression('repayment');
    const rows = await this.repaymentRepo
      .createQueryBuilder('repayment')
      .leftJoin('repayment.center', 'center')
      .select('center.id', 'centerId')
      .addSelect(`COALESCE(center.name, 'Unknown center')`, 'centerName')
      .addSelect(`${businessDateExpr}::text`, 'collectionDate')
      .addSelect('COUNT(*)::int', 'pendingCount')
      .addSelect(
        `SUM(CASE WHEN repayment.operationType = :paymentType THEN 1 ELSE 0 END)::int`,
        'paymentCount',
      )
      .addSelect(
        `SUM(CASE WHEN repayment.operationType = :reversalType THEN 1 ELSE 0 END)::int`,
        'reversalCount',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN repayment.operationType = :paymentType THEN repayment.amount ELSE 0 END), 0)::numeric`,
        'paymentAmount',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN repayment.operationType = :reversalType THEN repayment.amount ELSE 0 END), 0)::numeric`,
        'reversalAmount',
      )
      .addSelect(
        `COALESCE(SUM(CASE
          WHEN repayment.operationType = :reversalType THEN -repayment.amount
          ELSE repayment.amount
        END), 0)::numeric`,
        'netAmount',
      )
      .where('repayment.status = :pendingStatus', {
        pendingStatus: RepaymentStatus.PENDING,
      })
      .andWhere('center.id IS NOT NULL')
      .setParameters({
        paymentType: RepaymentOperationType.PAYMENT,
        reversalType: RepaymentOperationType.REVERSAL,
      })
      .groupBy('center.id')
      .addGroupBy('center.name')
      .addGroupBy(businessDateExpr)
      .orderBy(`${businessDateExpr}`, 'DESC')
      .addOrderBy('center.name', 'ASC')
      .getRawMany<{
        centerId: string;
        centerName: string;
        collectionDate: string;
        pendingCount: string;
        paymentCount: string;
        reversalCount: string;
        paymentAmount: string;
        reversalAmount: string;
        netAmount: string;
      }>();

    return rows.map((row) => ({
      centerId: row.centerId,
      centerName: row.centerName || 'Unknown center',
      collectionDate: row.collectionDate,
      pendingCount: Number(row.pendingCount || 0),
      paymentCount: Number(row.paymentCount || 0),
      reversalCount: Number(row.reversalCount || 0),
      paymentAmount: Number(row.paymentAmount || 0),
      reversalAmount: Number(row.reversalAmount || 0),
      netAmount: Number(row.netAmount || 0),
    }));
  }

  private async findPendingRepaymentsByCollection(
    centerId: string,
    collectionDate: string,
  ): Promise<Repayment[]> {
    const businessDateExpr = this.businessDateExpression('repayment');
    return this.repaymentRepo
      .createQueryBuilder('repayment')
      .leftJoinAndSelect('repayment.loan', 'loan')
      .leftJoinAndSelect('repayment.member', 'member')
      .leftJoinAndSelect('repayment.center', 'center')
      .where('repayment.status = :pendingStatus', {
        pendingStatus: RepaymentStatus.PENDING,
      })
      .andWhere('center.id = :centerId', { centerId })
      .andWhere(`${businessDateExpr} = CAST(:collectionDate AS date)`, {
        collectionDate,
      })
      .orderBy('repayment.createdAt', 'ASC')
      .getMany();
  }

  async approvePendingCollection(
    centerId: string,
    collectionDate: string,
    actorId?: string,
  ): Promise<PendingCollectionActionResult> {
    const normalizedDate = this.normalizeCollectionDate(collectionDate);
    const pendingRepayments = await this.findPendingRepaymentsByCollection(
      centerId,
      normalizedDate,
    );

    if (!pendingRepayments.length) {
      throw new NotFoundException(
        'No pending repayments found for the selected collection',
      );
    }

    for (const repayment of pendingRepayments) {
      try {
        await this.approveRepayment(repayment.id, actorId);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown approval error';
        throw new BadRequestException(
          `Failed to approve collection. Repayment ${repayment.id}: ${message}`,
        );
      }
    }

    return {
      centerId,
      collectionDate: normalizedDate,
      processedCount: pendingRepayments.length,
      approvedCount: pendingRepayments.length,
    };
  }

  async rejectPendingCollection(
    centerId: string,
    collectionDate: string,
    actorId?: string,
    reason?: string,
  ): Promise<PendingCollectionActionResult> {
    const normalizedDate = this.normalizeCollectionDate(collectionDate);
    const pendingRepayments = await this.findPendingRepaymentsByCollection(
      centerId,
      normalizedDate,
    );

    if (!pendingRepayments.length) {
      throw new NotFoundException(
        'No pending repayments found for the selected collection',
      );
    }

    for (const repayment of pendingRepayments) {
      try {
        await this.rejectRepayment(repayment.id, actorId, reason);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown rejection error';
        throw new BadRequestException(
          `Failed to reject collection. Repayment ${repayment.id}: ${message}`,
        );
      }
    }

    return {
      centerId,
      collectionDate: normalizedDate,
      processedCount: pendingRepayments.length,
      rejectedCount: pendingRepayments.length,
    };
  }

  async approveRepayment(id: string, actorId?: string): Promise<Repayment> {
    const repayment = await this.repaymentRepo.findOne({
      where: { id },
      relations: ['loan', 'member', 'center'],
    });
    if (!repayment) {
      throw new NotFoundException('Repayment not found');
    }

    if (repayment.status !== RepaymentStatus.PENDING) {
      throw new BadRequestException('Only pending repayments can be approved');
    }

    if (repayment.operationType === RepaymentOperationType.REVERSAL) {
      return this.approveReversalRepayment(repayment, actorId);
    }

    return this.approvePaymentRepayment(repayment, actorId);
  }

  private async approvePaymentRepayment(
    repayment: Repayment,
    actorId?: string,
  ): Promise<Repayment> {
    const loan = await this.loanRepo.findOne({
      where: { id: repayment.loan?.id },
      relations: ['borrower', 'borrower.center'],
    });
    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    const member = repayment.member;
    const center = repayment.center ?? member?.center ?? null;
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const previousAmountPaid = Number(loan.amountPaid ?? 0);
    await this.loansService.applyRepayment(
      loan.id,
      Number(repayment.amount),
      Boolean(repayment.useSavings),
    );

    const updatedLoan = await this.loanRepo.findOne({
      where: { id: loan.id },
      relations: ['borrower', 'borrower.center'],
    });
    const targetLoan = updatedLoan ?? loan;

    await this.ensureLoanSchedule(targetLoan, member, center);

    const cumulativeAmountPaid = Number(targetLoan.amountPaid) || 0;
    const newlyAppliedAmount = cumulativeAmountPaid - previousAmountPaid;

    if (newlyAppliedAmount > 0) {
      const cashPortion = Number(repayment.amount);
      const savingsPortion = Math.max(0, newlyAppliedAmount - cashPortion);
      await this.applyRepaymentToSchedule({
        loan: targetLoan,
        member,
        center,
        repayment,
        allocationAmount: newlyAppliedAmount,
        cashPortion,
        savingsPortion,
        paymentDate:
          repayment.collectionDate ??
          this.normalizeCollectionDate(repayment.createdAt.toISOString()),
      });
    }

    const targetCenterId = center?.id ?? repayment.center?.id;
    if (!targetCenterId) {
      throw new NotFoundException('Center not found');
    }

    await this.recordCollectionEntry({
      memberId: member.id,
      centerId: targetCenterId,
      collectionDate:
        repayment.collectionDate ?? this.normalizeCollectionDate(),
      weeklyAmount:
        Number(targetLoan.weeklyPaymentAmount) ||
        Number(loan.weeklyPaymentAmount) ||
        0,
      amountApplied: newlyAppliedAmount,
      totalWeeksPaid: Number(targetLoan.weeksPaid) || 0,
      notes: repayment.notes ?? undefined,
    });

    return this.markRepaymentApproved(repayment, actorId);
  }

  private async approveReversalRepayment(
    reversal: Repayment,
    actorId?: string,
  ): Promise<Repayment> {
    const originalRepaymentId = reversal.relatedRepaymentId;
    if (!originalRepaymentId) {
      throw new BadRequestException(
        'Reversal request is missing source repayment reference',
      );
    }

    const original = await this.repaymentRepo.findOne({
      where: { id: originalRepaymentId },
      relations: ['loan', 'member', 'center'],
    });
    if (!original) {
      throw new NotFoundException('Original repayment not found');
    }
    if (original.operationType === RepaymentOperationType.REVERSAL) {
      throw new BadRequestException(
        'Original repayment for reversal is invalid',
      );
    }
    if (original.status !== RepaymentStatus.APPROVED) {
      throw new BadRequestException('Only approved repayments can be reversed');
    }

    const loan = await this.loanRepo.findOne({
      where: { id: original.loan?.id },
      relations: ['borrower', 'borrower.center'],
    });
    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    const member = original.member ?? loan.borrower;
    if (!member) {
      throw new NotFoundException('Member not found');
    }
    const center =
      original.center ?? member.center ?? loan.borrower?.center ?? null;
    if (!center?.id) {
      throw new NotFoundException('Center not found');
    }

    const originalAllocations = await this.allocationRepo.find({
      where: { repaymentId: original.id },
    });

    const totalApplied = originalAllocations.length
      ? originalAllocations.reduce(
          (sum, allocation) => sum + Number(allocation.amountApplied || 0),
          0,
        )
      : Number(original.amount || 0);
    const savingsUsed = originalAllocations.reduce(
      (sum, allocation) => sum + Number(allocation.savingsPortion || 0),
      0,
    );

    const paymentDate = this.parseDate(
      reversal.collectionDate ??
        this.normalizeCollectionDate(reversal.createdAt.toISOString()),
    );

    if (originalAllocations.length > 0) {
      const rollbackByScheduleId = new Map<string, number>();
      for (const allocation of originalAllocations) {
        const current = rollbackByScheduleId.get(allocation.scheduleId) ?? 0;
        rollbackByScheduleId.set(
          allocation.scheduleId,
          current + Number(allocation.amountApplied || 0),
        );
      }

      const targetSchedules = await this.scheduleRepo.find({
        where: { id: In([...rollbackByScheduleId.keys()]) },
      });
      for (const schedule of targetSchedules) {
        const rollbackAmount = rollbackByScheduleId.get(schedule.id) ?? 0;
        const currentPaid = Number(schedule.amountPaid || 0);
        schedule.amountPaid = Number(
          Math.max(0, currentPaid - rollbackAmount).toFixed(2),
        );
        schedule.status = this.resolveScheduleStatus(schedule, paymentDate);
      }
      if (targetSchedules.length > 0) {
        await this.scheduleRepo.save(targetSchedules);
      }
    }

    const previousAmountPaid = Number(loan.amountPaid || 0);
    const updatedAmountPaid = Math.max(0, previousAmountPaid - totalApplied);
    const weeklyAmount = Number(loan.weeklyPaymentAmount || 0);
    const recomputedWeeksPaid =
      weeklyAmount > 0 ? Math.floor(updatedAmountPaid / weeklyAmount) : 0;
    const recomputedBuffer =
      weeklyAmount > 0
        ? Number((updatedAmountPaid - recomputedWeeksPaid * weeklyAmount).toFixed(2))
        : 0;

    loan.amountPaid = updatedAmountPaid;
    loan.weeksPaid = recomputedWeeksPaid;
    loan.advancePaymentBuffer = recomputedBuffer;
    loan.balance = Number(
      Math.max(0, Number(loan.totalAmount || 0) - updatedAmountPaid).toFixed(2),
    );
    loan.savings = Number(
      (Number(loan.savings || 0) + Number(savingsUsed || 0)).toFixed(2),
    );
    if (loan.balance === 0) {
      loan.status = 'paid';
    } else if (loan.status === 'paid') {
      loan.status = 'active';
    }
    await this.loanRepo.save(loan);

    if (savingsUsed > 0) {
      const savingsEntry = this.savingsRepo.create({
        borrower: member,
        loan,
        amount: Number(savingsUsed.toFixed(2)),
        remarks: `Reversal credit for repayment ${original.id}`,
      });
      await this.savingsRepo.save(savingsEntry);
    }

    await this.reverseCollectionEntry({
      memberId: member.id,
      centerId: center.id,
      collectionDate:
        original.collectionDate ??
        this.normalizeCollectionDate(original.createdAt.toISOString()),
      amountToReverse: totalApplied,
      totalWeeksPaid: Number(loan.weeksPaid) || 0,
      notes: reversal.notes ?? undefined,
    });

    return this.markRepaymentApproved(reversal, actorId);
  }

  private async markRepaymentApproved(
    repayment: Repayment,
    actorId?: string,
  ): Promise<Repayment> {
    repayment.status = RepaymentStatus.APPROVED;
    repayment.approvedById = actorId ?? null;
    repayment.approvedAt = new Date();
    repayment.rejectedById = null;
    repayment.rejectedAt = null;
    repayment.rejectedReason = null;
    if (!repayment.collectionDate) {
      repayment.collectionDate = this.normalizeCollectionDate();
    }
    return this.repaymentRepo.save(repayment);
  }

  async rejectRepayment(
    id: string,
    actorId?: string,
    reason?: string,
  ): Promise<Repayment> {
    const repayment = await this.repaymentRepo.findOne({ where: { id } });
    if (!repayment) {
      throw new NotFoundException('Repayment not found');
    }

    if (repayment.status !== RepaymentStatus.PENDING) {
      throw new BadRequestException('Only pending repayments can be rejected');
    }

    repayment.status = RepaymentStatus.REJECTED;
    repayment.rejectedById = actorId ?? null;
    repayment.rejectedAt = new Date();
    repayment.rejectedReason = reason?.trim() || null;
    return this.repaymentRepo.save(repayment);
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

  private async reverseCollectionEntry(params: {
    memberId: string;
    centerId: string;
    collectionDate: string;
    amountToReverse: number;
    totalWeeksPaid: number;
    notes?: string;
  }) {
    const { memberId, centerId, collectionDate, amountToReverse, totalWeeksPaid, notes } =
      params;
    const existing = await this.collectionRepo.findOne({
      where: { memberId, centerId, collectionDate },
    });
    if (!existing) {
      return;
    }

    const nextReceived = Math.max(
      0,
      Number(existing.paymentReceived || 0) - Number(amountToReverse || 0),
    );
    existing.paymentReceived = Number(nextReceived.toFixed(2));
    existing.numberOfPayments = totalWeeksPaid;
    if (notes) {
      existing.notes = notes;
    }
    await this.collectionRepo.save(existing);
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

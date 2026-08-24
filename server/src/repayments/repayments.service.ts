import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
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
import { buildLoanRepaymentBreakdown } from './loan-repayment-schedule.utils';
import { getRealizedAllocationSplit } from './loan-repayment-allocation.utils';
import { Savings } from '../savings/savings.entity';
import {
  CollectionBatch,
  CollectionBatchStatus,
} from './entities/collection-batch.entity';
import { BusinessTimeService } from '../common/business-time/business-time.service';

export interface PendingRepaymentCollectionGroup {
  batchId: string | null;
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
  batchId?: string | null;
  centerId: string;
  collectionDate: string;
  processedCount: number;
  approvedCount?: number;
  rejectedCount?: number;
}

export interface RepaymentScheduleRepairSummary {
  loansScanned: number;
  loansRepaired: number;
  schedulesCreated: number;
  allocationsDeleted: number;
  approvedRepaymentsReplayed: number;
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
    @InjectRepository(CollectionBatch)
    private readonly collectionBatchRepo: Repository<CollectionBatch>,
    private readonly dataSource: DataSource,
    private readonly loansService: LoansService,
    private readonly businessTime: BusinessTimeService,
  ) {}

  private async lockRepaymentRows(
    manager: EntityManager,
    repaymentIds: string[],
  ): Promise<void> {
    const repository = manager.getRepository(Repayment);
    for (const id of [...new Set(repaymentIds)].sort()) {
      const repayment = await repository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!repayment) {
        throw new NotFoundException('Repayment not found');
      }
    }
  }

  private async loadRepaymentWithRelations(
    manager: EntityManager,
    repaymentId: string,
  ): Promise<Repayment> {
    const repayment = await manager.getRepository(Repayment).findOne({
      where: { id: repaymentId },
      relations: ['loan', 'member', 'member.center', 'center'],
    });
    if (!repayment) {
      throw new NotFoundException('Repayment not found');
    }
    return repayment;
  }

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

  async repairExistingRepaymentSchedules(
    onProgress?: (message: string) => void,
  ): Promise<RepaymentScheduleRepairSummary> {
    const loans = await this.loanRepo.find({
      relations: ['borrower', 'borrower.center'],
      order: { createdAt: 'ASC' },
    });

    const summary: RepaymentScheduleRepairSummary = {
      loansScanned: loans.length,
      loansRepaired: 0,
      schedulesCreated: 0,
      allocationsDeleted: 0,
      approvedRepaymentsReplayed: 0,
    };

    for (const [index, loan] of loans.entries()) {
      const borrower = loan.borrower;
      if (!borrower) {
        continue;
      }

      const center = borrower.center ?? null;
      const schedulesBefore = await this.scheduleRepo.find({
        where: { loanId: loan.id },
      });
      const scheduleCountBefore = schedulesBefore.length;

      const approvedEntries = await this.repaymentRepo.find({
        where: { loan: { id: loan.id }, status: RepaymentStatus.APPROVED },
        relations: ['loan'],
        order: { createdAt: 'ASC' },
      });

      const deletedAllocations = schedulesBefore.length
        ? await this.allocationRepo.count({
            where: {
              scheduleId: In(schedulesBefore.map((schedule) => schedule.id)),
            },
          })
        : 0;

      onProgress?.(
        `Repairing loan ${index + 1}/${loans.length}: ${loan.id} (${approvedEntries.length} approved repayments)`,
      );

      await this.ensureLoanSchedule(loan, borrower, center);
      await this.replayExistingRepayments(loan, borrower, center);

      const scheduleCountAfter = await this.scheduleRepo.count({
        where: { loanId: loan.id },
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

      summary.loansRepaired += 1;
      summary.schedulesCreated += Math.max(
        0,
        scheduleCountAfter - scheduleCountBefore,
      );
      summary.allocationsDeleted += deletedAllocations;
      summary.approvedRepaymentsReplayed += approvedEntries.filter(
        (entry) =>
          entry.operationType !== RepaymentOperationType.REVERSAL &&
          !reversedRepaymentIds.has(entry.id),
      ).length;
    }

    return summary;
  }

  private normalizeCollectionDate(collectionDate?: string): string {
    return this.businessTime.toBusinessDate(collectionDate);
  }

  private async ensurePendingCollectionBatch(
    centerId: string,
    collectionDate: string,
    submittedById?: string | null,
    manager?: EntityManager,
  ): Promise<CollectionBatch> {
    const repository = manager
      ? manager.getRepository(CollectionBatch)
      : this.collectionBatchRepo;
    const existing = await repository.findOne({
      where: {
        centerId,
        collectionDate,
        status: CollectionBatchStatus.PENDING,
      },
    });

    if (existing) {
      return existing;
    }

    const result = await repository
      .createQueryBuilder()
      .insert()
      .into(CollectionBatch)
      .values({
        centerId,
        collectionDate,
        status: CollectionBatchStatus.PENDING,
        submittedById: submittedById ?? null,
        submittedAt: new Date(),
      })
      .onConflict(
        `("centerId", "collectionDate") WHERE "status" = 'pending' DO NOTHING`,
      )
      .returning('*')
      .execute();
    const inserted = (result.raw as CollectionBatch[])[0];
    if (inserted) {
      return repository.create(inserted);
    }

    const current = await repository.findOne({
      where: {
        centerId,
        collectionDate,
        status: CollectionBatchStatus.PENDING,
      },
    });
    if (!current) {
      throw new BadRequestException('Unable to establish pending collection');
    }
    return current;
  }

  async create(
    body: {
      loanId: string;
      memberId: string;
      centerId: string;
      amount: number;
      collectionDate?: string;
      notes?: string;
      useSavings?: boolean;
    },
    actor?: { userId?: string; role?: string },
  ) {
    const {
      loanId,
      memberId,
      centerId,
      amount,
      collectionDate,
      notes,
      useSavings = false,
    } = body;

    if (
      amount === undefined ||
      amount === null ||
      Number.isNaN(Number(amount))
    ) {
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

    const collectionDateString = this.normalizeCollectionDate(collectionDate);
    const createdById = actor?.userId ?? null;
    const shouldAutoApprove =
      actor?.role === 'manager' || actor?.role === 'admin';
    const savedRepayment = await this.dataSource.transaction(
      async (manager) => {
        const loan = await this.loansService.lockLoanForFinancialUpdate(
          manager,
          loanId,
          ['borrower', 'borrower.center'],
        );
        const memberRepository = manager.getRepository(Member);
        const centerRepository = manager.getRepository(Center);
        const repaymentRepository = manager.getRepository(Repayment);
        const member = await memberRepository.findOne({
          where: { id: memberId },
          relations: ['center'],
        });
        const center = await centerRepository.findOne({
          where: { id: centerId },
        });

        if (!member) throw new NotFoundException('Member not found');
        if (!center) throw new NotFoundException('Center not found');
        if (loan.status !== 'active') {
          throw new BadRequestException(
            'Cannot post payment for a non-active loan',
          );
        }
        if (loan.borrower?.id !== member.id) {
          throw new BadRequestException('Loan does not belong to the member');
        }
        if (member.center?.id !== center.id) {
          throw new BadRequestException('Member does not belong to the center');
        }

        const activeLoans = await manager.getRepository(Loan).find({
          where: { borrower: { id: member.id }, status: 'active' },
        });
        if (activeLoans.length > 1) {
          throw new BadRequestException(
            'Member has multiple active loans. Resolve loan records before posting payment',
          );
        }
        if (activeLoans.length !== 1 || activeLoans[0].id !== loan.id) {
          throw new BadRequestException(
            'Submitted loan is not the member active loan',
          );
        }

        const pendingBatch = shouldAutoApprove
          ? null
          : await this.ensurePendingCollectionBatch(
              center.id,
              collectionDateString,
              createdById,
              manager,
            );
        const repayment = repaymentRepository.create({
          loan,
          member,
          center,
          amount: numericAmount,
          notes,
          paymentDate: collectionDateString,
          collectionDate: collectionDateString,
          useSavings: Boolean(useSavings),
          status: RepaymentStatus.PENDING,
          operationType: RepaymentOperationType.PAYMENT,
          relatedRepaymentId: null,
          batchId: pendingBatch?.id ?? null,
          createdById,
        });
        return repaymentRepository.save(repayment);
      },
    );

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
    const locator = await this.repaymentRepo.findOne({
      where: { id: repaymentId },
      relations: ['loan'],
    });
    if (!locator?.loan?.id) {
      throw new NotFoundException('Repayment not found');
    }
    const createdById = actor?.userId ?? null;
    const shouldAutoApprove =
      actor?.role === 'manager' || actor?.role === 'admin';
    const reason = body.reason?.trim();
    const savedReversal = await this.dataSource.transaction(async (manager) => {
      await this.loansService.lockLoanForFinancialUpdate(
        manager,
        locator.loan.id,
      );
      await this.lockRepaymentRows(manager, [repaymentId]);
      const sourceRepayment = await this.loadRepaymentWithRelations(
        manager,
        repaymentId,
      );
      if (sourceRepayment.loan?.id !== locator.loan.id) {
        throw new BadRequestException('Repayment loan changed during reversal');
      }
      if (sourceRepayment.operationType === RepaymentOperationType.REVERSAL) {
        throw new BadRequestException('Cannot reverse a reversal transaction');
      }
      if (sourceRepayment.status !== RepaymentStatus.APPROVED) {
        throw new BadRequestException(
          'Only approved repayments can be reversed',
        );
      }

      const repaymentRepository = manager.getRepository(Repayment);
      const existingReversal = await repaymentRepository.findOne({
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

      const sourceCenterId = sourceRepayment.center?.id;
      if (!sourceCenterId) {
        throw new NotFoundException('Center not found');
      }
      const reversalCollectionDate =
        sourceRepayment.collectionDate ??
        this.normalizeCollectionDate(sourceRepayment.createdAt.toISOString());
      const pendingBatch = shouldAutoApprove
        ? null
        : await this.ensurePendingCollectionBatch(
            sourceCenterId,
            reversalCollectionDate,
            createdById,
            manager,
          );
      const reversal = repaymentRepository.create({
        loan: sourceRepayment.loan,
        member: sourceRepayment.member,
        center: sourceRepayment.center,
        amount: Number(sourceRepayment.amount),
        notes:
          reason && reason.length > 0
            ? reason
            : `Reversal request for repayment ${sourceRepayment.id}`,
        collectionDate: reversalCollectionDate,
        useSavings: false,
        status: RepaymentStatus.PENDING,
        operationType: RepaymentOperationType.REVERSAL,
        relatedRepaymentId: sourceRepayment.id,
        batchId: pendingBatch?.id ?? null,
        createdById,
      });
      return repaymentRepository.save(reversal);
    });

    if (!shouldAutoApprove) {
      return savedReversal;
    }

    return this.approveRepayment(savedReversal.id, createdById ?? undefined);
  }

  private parseDate(date: string): Date {
    return this.businessTime.calendarDateToDate(date);
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

  private normalizeDate(input: Date | string | null | undefined): Date {
    return this.businessTime.calendarDateToDate(
      this.businessTime.toBusinessDate(input),
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
    const currentIndex = this.businessTime.calendarDayOfWeek(
      this.formatDate(baseDate),
    );
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
    manager?: EntityManager,
  ): Promise<void> {
    const scheduleRepository = manager
      ? manager.getRepository(LoanRepaymentSchedule)
      : this.scheduleRepo;
    const existingRows = await scheduleRepository.find({
      where: { loanId: loan.id },
      order: { weekNumber: 'ASC' },
    });
    if (existingRows.length > 0) {
      const breakdown = buildLoanRepaymentBreakdown(loan);
      const needsBreakdownBackfill = existingRows.some(
        (schedule, index) =>
          Number(schedule.principalDue || 0) !==
            Number(breakdown[index]?.principalDue ?? 0) ||
          Number(schedule.interestDue || 0) !==
            Number(
              (
                Number(schedule.amountDue || 0) -
                Number(breakdown[index]?.principalDue ?? 0)
              ).toFixed(2),
            ),
      );

      if (needsBreakdownBackfill && breakdown.length === existingRows.length) {
        await scheduleRepository.save(
          existingRows.map((schedule, index) => ({
            ...schedule,
            principalDue: breakdown[index]?.principalDue ?? 0,
            interestDue: Number(
              (
                Number(schedule.amountDue || 0) -
                Number(breakdown[index]?.principalDue ?? 0)
              ).toFixed(2),
            ),
          })),
        );
      }
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
    const breakdown = buildLoanRepaymentBreakdown(loan);

    const rows: LoanRepaymentSchedule[] = [];
    for (let i = 0; i < termWeeks; i += 1) {
      const dueDate = this.formatDate(this.addDays(firstDueDate, i * 7));
      const scheduleBreakdown = breakdown[i];
      const schedule = scheduleRepository.create({
        loanId: loan.id,
        memberId: memberId ?? null,
        centerId: centerId ?? null,
        weekNumber: i + 1,
        dueDate,
        amountDue: scheduleBreakdown?.amountDue ?? weeklyDue,
        principalDue: scheduleBreakdown?.principalDue ?? 0,
        interestDue:
          scheduleBreakdown?.interestDue ?? Math.max(0, Number(weeklyDue || 0)),
        amountPaid: 0,
        status: LoanRepaymentStatus.UNPAID,
        advanceApplied: 0,
      });
      rows.push(schedule);
    }
    await scheduleRepository.save(rows);
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

  private async applyRepaymentToSchedule(params: {
    manager?: EntityManager;
    loan: Loan;
    member: Member;
    center: Center | null;
    repayment: Repayment;
    allocationAmount: number;
    cashPortion: number;
    savingsPortion: number;
    paymentDate: string | null;
  }): Promise<void> {
    const {
      loan,
      manager,
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

    await this.ensureLoanSchedule(loan, member, center, manager);

    const scheduleRepository = manager
      ? manager.getRepository(LoanRepaymentSchedule)
      : this.scheduleRepo;
    const allocationRepository = manager
      ? manager.getRepository(LoanRepaymentAllocation)
      : this.allocationRepo;
    const schedules = await scheduleRepository.find({
      where: { loanId: loan.id },
      order: { dueDate: 'ASC', weekNumber: 'ASC' },
    });

    let remaining = allocationAmount;
    let cashRemaining = Math.max(0, cashPortion);
    let savingsRemaining = Math.max(0, savingsPortion);
    const touched = new Map<string, LoanRepaymentSchedule>();
    const allocations = new Map<string, LoanRepaymentAllocation>();

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
      const realizedSplit = getRealizedAllocationSplit(
        {
          amountPaid: paid,
          interestDue: schedule.interestDue,
          principalDue: schedule.principalDue,
        },
        applied,
      );
      schedule.amountPaid = Number((paid + applied).toFixed(2));
      const statusDate = paymentDate ?? schedule.dueDate;
      const paymentDateObj = this.businessTime.calendarDateToDate(statusDate);
      schedule.status = this.resolveScheduleStatus(schedule, paymentDateObj);
      touched.set(schedule.id, schedule);
      allocations.set(
        schedule.id,
        allocationRepository.create({
          repaymentId: repayment.id,
          scheduleId: schedule.id,
          amountApplied: applied,
          cashPortion: cashApplied,
          savingsPortion: savingsApplied,
          principalPortion: realizedSplit.principalPortion,
          interestPortion: realizedSplit.interestPortion,
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
      touched.set(last.id, last);
      const cashApplied = Math.min(cashRemaining, remaining);
      const savingsApplied = Math.max(0, remaining - cashRemaining);
      const existingAllocation = allocations.get(last.id);
      if (existingAllocation) {
        existingAllocation.amountApplied = Number(
          (Number(existingAllocation.amountApplied || 0) + remaining).toFixed(
            2,
          ),
        );
        existingAllocation.cashPortion = Number(
          (Number(existingAllocation.cashPortion || 0) + cashApplied).toFixed(
            2,
          ),
        );
        existingAllocation.savingsPortion = Number(
          (
            Number(existingAllocation.savingsPortion || 0) + savingsApplied
          ).toFixed(2),
        );
      } else {
        allocations.set(
          last.id,
          allocationRepository.create({
            repaymentId: repayment.id,
            scheduleId: last.id,
            amountApplied: remaining,
            cashPortion: cashApplied,
            savingsPortion: savingsApplied,
            principalPortion: 0,
            interestPortion: 0,
          }),
        );
      }
      remaining = 0;
    }

    if (touched.size > 0) {
      await scheduleRepository.save([...touched.values()]);
    }
    if (allocations.size > 0) {
      await allocationRepository.save([...allocations.values()]);
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
      if (repayment.paymentDate) {
        continue;
      }

      repayment.paymentDate = this.normalizeCollectionDate(
        repayment.collectionDate ?? repayment.createdAt?.toISOString(),
      );
      await this.repaymentRepo.update(repayment.id, {
        paymentDate: repayment.paymentDate,
      });
    }

    approvedPayments.sort((left, right) => {
      const leftDate = this.getRepaymentAppliedDate(left)?.getTime() ?? 0;
      const rightDate = this.getRepaymentAppliedDate(right)?.getTime() ?? 0;

      if (leftDate !== rightDate) {
        return leftDate - rightDate;
      }

      return (
        (left.createdAt?.getTime() ?? 0) - (right.createdAt?.getTime() ?? 0)
      );
    });

    for (const repayment of approvedPayments) {
      await this.applyRepaymentToSchedule({
        loan,
        member,
        center,
        repayment,
        allocationAmount: Number(repayment.amount || 0),
        cashPortion: Number(repayment.amount || 0),
        savingsPortion: 0,
        paymentDate: repayment.paymentDate,
      });
    }
  }

  private getRepaymentAppliedDate(repayment: Repayment): Date | null {
    if (!repayment.paymentDate) {
      return null;
    }

    return this.parseDate(repayment.paymentDate);
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
    const pendingEntries = await this.repaymentRepo.find({
      where: { status: RepaymentStatus.PENDING },
      relations: ['center', 'batch'],
      order: { createdAt: 'DESC' },
    });

    const grouped = new Map<string, PendingRepaymentCollectionGroup>();

    for (const entry of pendingEntries) {
      const center = entry.center;
      if (!center?.id) {
        continue;
      }

      if (
        entry.batchId &&
        entry.batch?.status !== CollectionBatchStatus.PENDING
      ) {
        continue;
      }

      const collectionDate = this.normalizeCollectionDate(
        entry.collectionDate ?? entry.createdAt?.toISOString(),
      );
      const batchId = entry.batchId ?? null;
      const key = `${batchId ?? 'legacy'}::${center.id}::${collectionDate}`;
      const amount = Number(entry.amount || 0);
      const operationType = entry.operationType;

      const current = grouped.get(key) ?? {
        batchId,
        centerId: center.id,
        centerName: center.name || 'Unknown center',
        collectionDate,
        pendingCount: 0,
        paymentCount: 0,
        reversalCount: 0,
        paymentAmount: 0,
        reversalAmount: 0,
        netAmount: 0,
      };

      current.pendingCount += 1;
      if (operationType === RepaymentOperationType.REVERSAL) {
        current.reversalCount += 1;
        current.reversalAmount += amount;
        current.netAmount -= amount;
      } else {
        current.paymentCount += 1;
        current.paymentAmount += amount;
        current.netAmount += amount;
      }

      grouped.set(key, current);
    }

    return [...grouped.values()]
      .map((item) => ({
        ...item,
        paymentAmount: Number(item.paymentAmount.toFixed(2)),
        reversalAmount: Number(item.reversalAmount.toFixed(2)),
        netAmount: Number(item.netAmount.toFixed(2)),
      }))
      .sort(
        (a, b) =>
          b.collectionDate.localeCompare(a.collectionDate) ||
          a.centerName.localeCompare(b.centerName),
      );
  }

  async findPendingRepaymentsForCollection(
    centerId: string,
    collectionDate: string,
  ): Promise<Repayment[]> {
    const normalizedDate = this.normalizeCollectionDate(collectionDate);
    return this.findPendingRepaymentsByCollection(centerId, normalizedDate);
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

  private async findPendingRepaymentsByBatch(
    batchId: string,
  ): Promise<Repayment[]> {
    return this.repaymentRepo.find({
      where: {
        batchId,
        status: RepaymentStatus.PENDING,
      },
      relations: ['loan', 'member', 'center'],
      order: { createdAt: 'ASC' },
    });
  }

  async approvePendingCollection(
    centerId: string,
    collectionDate: string,
    actorId?: string,
  ): Promise<PendingCollectionActionResult> {
    const normalizedDate = this.normalizeCollectionDate(collectionDate);
    const pendingBatch = await this.collectionBatchRepo.findOne({
      where: {
        centerId,
        collectionDate: normalizedDate,
        status: CollectionBatchStatus.PENDING,
      },
    });
    const pendingRepayments = pendingBatch
      ? await this.findPendingRepaymentsByBatch(pendingBatch.id)
      : await this.findPendingRepaymentsByCollection(centerId, normalizedDate);

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

    if (pendingBatch) {
      pendingBatch.status = CollectionBatchStatus.APPROVED;
      pendingBatch.approvedById = actorId ?? null;
      pendingBatch.approvedAt = new Date();
      pendingBatch.rejectedById = null;
      pendingBatch.rejectedAt = null;
      pendingBatch.rejectedReason = null;
      await this.collectionBatchRepo.save(pendingBatch);
    }

    return {
      batchId: pendingBatch?.id ?? null,
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
    const pendingBatch = await this.collectionBatchRepo.findOne({
      where: {
        centerId,
        collectionDate: normalizedDate,
        status: CollectionBatchStatus.PENDING,
      },
    });
    const pendingRepayments = pendingBatch
      ? await this.findPendingRepaymentsByBatch(pendingBatch.id)
      : await this.findPendingRepaymentsByCollection(centerId, normalizedDate);

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

    if (pendingBatch) {
      pendingBatch.status = CollectionBatchStatus.REJECTED;
      pendingBatch.rejectedById = actorId ?? null;
      pendingBatch.rejectedAt = new Date();
      pendingBatch.rejectedReason = reason?.trim() || null;
      pendingBatch.approvedById = null;
      pendingBatch.approvedAt = null;
      await this.collectionBatchRepo.save(pendingBatch);
    }

    return {
      batchId: pendingBatch?.id ?? null,
      centerId,
      collectionDate: normalizedDate,
      processedCount: pendingRepayments.length,
      rejectedCount: pendingRepayments.length,
    };
  }

  async approveRepayment(id: string, actorId?: string): Promise<Repayment> {
    const locator = await this.repaymentRepo.findOne({
      where: { id },
      relations: ['loan'],
    });
    if (!locator?.loan?.id) {
      throw new NotFoundException('Repayment not found');
    }
    const repaymentIds = [id];
    if (
      locator.operationType === RepaymentOperationType.REVERSAL &&
      locator.relatedRepaymentId
    ) {
      repaymentIds.push(locator.relatedRepaymentId);
    }

    return this.dataSource.transaction(async (manager) => {
      const loan = await this.loansService.lockLoanForFinancialUpdate(
        manager,
        locator.loan.id,
        ['borrower', 'borrower.center'],
      );
      await this.lockRepaymentRows(manager, repaymentIds);
      const repayment = await this.loadRepaymentWithRelations(manager, id);
      if (repayment.loan?.id !== loan.id) {
        throw new BadRequestException('Repayment loan changed during approval');
      }
      if (repayment.status !== RepaymentStatus.PENDING) {
        throw new BadRequestException(
          'Only pending repayments can be approved',
        );
      }

      if (repayment.operationType === RepaymentOperationType.REVERSAL) {
        if (
          !repayment.relatedRepaymentId ||
          !repaymentIds.includes(repayment.relatedRepaymentId)
        ) {
          throw new BadRequestException(
            'Reversal source changed during approval',
          );
        }
        return this.approveReversalRepayment(manager, loan, repayment, actorId);
      }

      return this.approvePaymentRepayment(manager, loan, repayment, actorId);
    });
  }

  private async approvePaymentRepayment(
    manager: EntityManager,
    loan: Loan,
    repayment: Repayment,
    actorId?: string,
  ): Promise<Repayment> {
    const member = repayment.member;
    const center = repayment.center ?? member?.center ?? null;
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const paymentDate =
      repayment.collectionDate ??
      this.normalizeCollectionDate(repayment.createdAt.toISOString());

    await this.ensureLoanSchedule(loan, member, center, manager);
    await this.loansService.postOverdueChargesForLoanInTransaction(
      manager,
      loan,
      paymentDate,
      repayment.id,
    );
    const repaymentApplication =
      await this.loansService.applyRepaymentWithChargeAllocationInTransaction(
        manager,
        loan,
        Number(repayment.amount),
        Boolean(repayment.useSavings),
        repayment.id,
      );
    const targetLoan = repaymentApplication.loan;

    if (repaymentApplication.regularApplied > 0) {
      await this.applyRepaymentToSchedule({
        manager,
        loan: targetLoan,
        member,
        center,
        repayment,
        allocationAmount: repaymentApplication.regularApplied,
        cashPortion: repaymentApplication.regularCashPortion,
        savingsPortion: repaymentApplication.regularSavingsPortion,
        paymentDate,
      });
    }

    const targetCenterId = center?.id ?? repayment.center?.id;
    if (!targetCenterId) {
      throw new NotFoundException('Center not found');
    }

    await this.recordCollectionEntry(manager, {
      memberId: member.id,
      centerId: targetCenterId,
      collectionDate:
        repayment.collectionDate ?? this.normalizeCollectionDate(),
      weeklyAmount:
        Number(targetLoan.weeklyPaymentAmount) ||
        Number(loan.weeklyPaymentAmount) ||
        0,
      amountApplied: repaymentApplication.totalApplied,
      totalWeeksPaid: Number(targetLoan.weeksPaid) || 0,
      notes: repayment.notes ?? undefined,
    });

    return this.markRepaymentApproved(manager, repayment, actorId);
  }

  private async approveReversalRepayment(
    manager: EntityManager,
    loan: Loan,
    reversal: Repayment,
    actorId?: string,
  ): Promise<Repayment> {
    const originalRepaymentId = reversal.relatedRepaymentId;
    if (!originalRepaymentId) {
      throw new BadRequestException(
        'Reversal request is missing source repayment reference',
      );
    }

    const original = await manager.getRepository(Repayment).findOne({
      where: { id: originalRepaymentId },
      relations: ['loan', 'member', 'member.center', 'center'],
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

    if (original.loan?.id !== loan.id) {
      throw new BadRequestException('Reversal source belongs to another loan');
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

    const allocationRepository = manager.getRepository(LoanRepaymentAllocation);
    const scheduleRepository = manager.getRepository(LoanRepaymentSchedule);
    const originalAllocations = await allocationRepository.find({
      where: { repaymentId: original.id },
    });
    const chargeReversal =
      await this.loansService.createChargePaymentReversalsForRepaymentInTransaction(
        manager,
        original.id,
      );

    const totalApplied = originalAllocations.length
      ? originalAllocations.reduce(
          (sum, allocation) => sum + Number(allocation.amountApplied || 0),
          0,
        )
      : Math.max(0, Number(original.amount || 0) - chargeReversal.totalAmount);
    const savingsUsed =
      originalAllocations.reduce(
        (sum, allocation) => sum + Number(allocation.savingsPortion || 0),
        0,
      ) + chargeReversal.savingsPortion;

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

      const targetSchedules = await scheduleRepository.find({
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
        await scheduleRepository.save(targetSchedules);
      }

      await allocationRepository.delete({ repaymentId: original.id });
    }

    const previousAmountPaid = Number(loan.amountPaid || 0);
    const updatedAmountPaid = Math.max(0, previousAmountPaid - totalApplied);
    const weeklyAmount = Number(loan.weeklyPaymentAmount || 0);
    const recomputedWeeksPaid =
      weeklyAmount > 0 ? Math.floor(updatedAmountPaid / weeklyAmount) : 0;
    const recomputedBuffer =
      weeklyAmount > 0
        ? Number(
            (updatedAmountPaid - recomputedWeeksPaid * weeklyAmount).toFixed(2),
          )
        : 0;

    loan.amountPaid = updatedAmountPaid;
    loan.pastDueInterestPaid = Number(
      Math.max(
        0,
        Number(loan.pastDueInterestPaid || 0) -
          chargeReversal.pastDueInterestAmount,
      ).toFixed(2),
    );
    loan.penaltyPaid = Number(
      Math.max(
        0,
        Number(loan.penaltyPaid || 0) - chargeReversal.penaltyAmount,
      ).toFixed(2),
    );
    loan.weeksPaid = recomputedWeeksPaid;
    loan.advancePaymentBuffer = recomputedBuffer;
    loan.balance = this.loansService.calculateLoanBalance(loan);
    loan.savings = Number(
      (Number(loan.savings || 0) + Number(savingsUsed || 0)).toFixed(2),
    );
    if (loan.balance === 0) {
      loan.status = 'paid';
    } else if (loan.status === 'paid') {
      loan.status = 'active';
    }
    await manager.getRepository(Loan).save(loan);

    if (savingsUsed > 0) {
      const savingsRepository = manager.getRepository(Savings);
      const savingsEntry = savingsRepository.create({
        borrower: member,
        loan,
        amount: Number(savingsUsed.toFixed(2)),
        remarks: `Reversal credit for repayment ${original.id}`,
      });
      await savingsRepository.save(savingsEntry);
    }

    await this.reverseCollectionEntry(manager, {
      memberId: member.id,
      centerId: center.id,
      collectionDate:
        original.collectionDate ??
        this.normalizeCollectionDate(original.createdAt.toISOString()),
      amountToReverse: totalApplied + chargeReversal.totalAmount,
      totalWeeksPaid: Number(loan.weeksPaid) || 0,
      notes: reversal.notes ?? undefined,
    });

    return this.markRepaymentApproved(manager, reversal, actorId);
  }

  private async markRepaymentApproved(
    manager: EntityManager,
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
    if (!repayment.paymentDate) {
      repayment.paymentDate = repayment.collectionDate;
    }
    return manager.getRepository(Repayment).save(repayment);
  }

  async rejectRepayment(
    id: string,
    actorId?: string,
    reason?: string,
  ): Promise<Repayment> {
    const locator = await this.repaymentRepo.findOne({
      where: { id },
      relations: ['loan'],
    });
    if (!locator?.loan?.id) {
      throw new NotFoundException('Repayment not found');
    }
    return this.dataSource.transaction(async (manager) => {
      await this.loansService.lockLoanForFinancialUpdate(
        manager,
        locator.loan.id,
      );
      await this.lockRepaymentRows(manager, [id]);
      const repayment = await manager
        .getRepository(Repayment)
        .findOne({ where: { id } });
      if (!repayment) {
        throw new NotFoundException('Repayment not found');
      }
      if (repayment.status !== RepaymentStatus.PENDING) {
        throw new BadRequestException(
          'Only pending repayments can be rejected',
        );
      }

      repayment.status = RepaymentStatus.REJECTED;
      repayment.rejectedById = actorId ?? null;
      repayment.rejectedAt = new Date();
      repayment.rejectedReason = reason?.trim() || null;
      return manager.getRepository(Repayment).save(repayment);
    });
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

    const schedule = await this.scheduleRepo.find({
      where: { loanId },
      order: { weekNumber: 'ASC', dueDate: 'ASC' },
    });

    if (loan.status === 'paid') {
      return schedule.map((row) => ({
        ...row,
        status:
          row.status === LoanRepaymentStatus.ADVANCE
            ? LoanRepaymentStatus.PAID
            : row.status,
      }));
    }

    return schedule;
  }

  private async reverseCollectionEntry(
    manager: EntityManager,
    params: {
      memberId: string;
      centerId: string;
      collectionDate: string;
      amountToReverse: number;
      totalWeeksPaid: number;
      notes?: string;
    },
  ) {
    const {
      memberId,
      centerId,
      collectionDate,
      amountToReverse,
      totalWeeksPaid,
      notes,
    } = params;
    const collectionRepository = manager.getRepository(Collection);
    const existing = await collectionRepository.findOne({
      where: { memberId, centerId, collectionDate },
      lock: { mode: 'pessimistic_write' },
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
    await collectionRepository.save(existing);
  }

  private async recordCollectionEntry(
    manager: EntityManager,
    params: {
      memberId: string;
      centerId: string;
      collectionDate: string;
      weeklyAmount: number;
      amountApplied: number;
      totalWeeksPaid: number;
      notes?: string;
    },
  ) {
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
    const collectionRepository = manager.getRepository(Collection);
    const existing = await collectionRepository.findOne({
      where: { memberId, centerId, collectionDate },
      lock: { mode: 'pessimistic_write' },
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
      await collectionRepository.save(existing);
      return;
    }

    const collection = collectionRepository.create({
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
    await collectionRepository.save(collection);
  }
}

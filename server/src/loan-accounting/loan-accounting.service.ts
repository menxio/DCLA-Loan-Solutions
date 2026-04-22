import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  LoanLedgerEntry,
  LoanLedgerEntryType,
} from './entities/loan-ledger-entry.entity';

export interface LoanLedgerHistoryItem {
  id: string;
  type: 'waiver';
  amount: number;
  direction: 'credit' | 'debit';
  member: {
    id: string | null;
    name: string;
    center?: {
      id: string | null;
      name: string | null;
    };
  };
  loan?: {
    id: string | null;
    status?: string | null;
  };
  notes?: string | null;
  createdAt: string;
  source: 'loan_accounting';
}

@Injectable()
export class LoanAccountingService {
  constructor(
    @InjectRepository(LoanLedgerEntry)
    private readonly loanLedgerEntryRepo: Repository<LoanLedgerEntry>,
  ) {}

  async recordWaiverEntry(
    params: {
      loanId: string;
      afterBalance: number;
      pastDueInterestWaived: number;
      penaltyWaived: number;
      totalWaived: number;
      reason?: string | null;
      createdById?: string | null;
      referenceId?: string | null;
      postedAt?: Date;
    },
    manager?: EntityManager,
  ): Promise<LoanLedgerEntry> {
    const repository = manager
      ? manager.getRepository(LoanLedgerEntry)
      : this.loanLedgerEntryRepo;

    const totalWaived = this.roundCurrency(params.totalWaived);
    const entry = repository.create({
      loanId: params.loanId,
      entryType: LoanLedgerEntryType.WAIVER,
      debit: 0,
      credit: totalWaived,
      balanceAfter: this.roundCurrency(params.afterBalance),
      remarks: this.buildWaiverRemarks({
        pastDueInterestWaived: params.pastDueInterestWaived,
        penaltyWaived: params.penaltyWaived,
        reason: params.reason,
      }),
      createdById: params.createdById ?? null,
      postedAt: params.postedAt ?? new Date(),
      referenceType: 'loan_waiver',
      referenceId: params.referenceId ?? null,
    });

    return repository.save(entry);
  }

  async getWaiverHistory(params: {
    memberId?: string;
    centerId?: string;
    loanId?: string;
    startDate?: string;
    endDate?: string;
    include: boolean;
  }): Promise<LoanLedgerHistoryItem[]> {
    const { include, memberId, centerId, loanId, startDate, endDate } = params;
    if (!include) {
      return [];
    }

    const qb = this.loanLedgerEntryRepo
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.loan', 'loan')
      .leftJoinAndSelect('loan.borrower', 'borrower')
      .leftJoinAndSelect('borrower.center', 'center')
      .where('entry.entryType = :entryType', {
        entryType: LoanLedgerEntryType.WAIVER,
      });

    if (memberId) {
      qb.andWhere('borrower.id = :memberId', { memberId });
    }

    if (centerId) {
      qb.andWhere('center.id = :centerId', { centerId });
    }

    if (loanId) {
      qb.andWhere('loan.id = :loanId', { loanId });
    }

    if (startDate) {
      const normalized = this.normalizeDate(startDate);
      if (normalized) {
        qb.andWhere('entry.postedAt >= :startDate', { startDate: normalized });
      }
    }

    if (endDate) {
      const normalized = this.normalizeDate(endDate, true);
      if (normalized) {
        qb.andWhere('entry.postedAt <= :endDate', { endDate: normalized });
      }
    }

    const rows = await qb.getMany();
    return rows.map((row) => this.mapLedgerEntry(row));
  }

  private mapLedgerEntry(entry: LoanLedgerEntry): LoanLedgerHistoryItem {
    const borrowerName = `${entry.loan?.borrower?.lastName ?? ''}, ${
      entry.loan?.borrower?.firstName ?? ''
    }`.trim();

    return {
      id: entry.id,
      type: 'waiver',
      amount: this.roundCurrency(entry.credit || 0),
      direction: 'credit',
      member: {
        id: entry.loan?.borrower?.id ?? null,
        name: borrowerName || 'Unknown Member',
        center: {
          id: entry.loan?.borrower?.center?.id ?? null,
          name: entry.loan?.borrower?.center?.name ?? null,
        },
      },
      loan: {
        id: entry.loan?.id ?? null,
        status: entry.loan?.status ?? null,
      },
      notes: entry.remarks ?? null,
      createdAt: entry.postedAt?.toISOString() ?? new Date().toISOString(),
      source: 'loan_accounting',
    };
  }

  private buildWaiverRemarks(params: {
    pastDueInterestWaived: number;
    penaltyWaived: number;
    reason?: string | null;
  }): string {
    const parts: string[] = [];
    if (this.roundCurrency(params.pastDueInterestWaived) > 0) {
      parts.push(
        `Past due interest waived: ${this.roundCurrency(
          params.pastDueInterestWaived,
        ).toFixed(2)}`,
      );
    }
    if (this.roundCurrency(params.penaltyWaived) > 0) {
      parts.push(
        `Penalty waived: ${this.roundCurrency(params.penaltyWaived).toFixed(2)}`,
      );
    }
    if (params.reason?.trim()) {
      parts.push(`Reason: ${params.reason.trim()}`);
    }
    return parts.join(' | ');
  }

  private normalizeDate(value?: string, endOfDay = false): string | undefined {
    if (!value) return undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return undefined;
    }
    if (endOfDay) {
      parsed.setHours(23, 59, 59, 999);
    }
    return parsed.toISOString();
  }

  private roundCurrency(value: number): number {
    return Number(Number(value || 0).toFixed(2));
  }
}

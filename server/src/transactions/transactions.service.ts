import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Repayment } from '../repayments/repayment.entity';
import { Savings } from '../savings/savings.entity';
import { TransactionsQueryDto } from './dto/transactions-query.dto';

export type TransactionType =
  | 'repayment'
  | 'savings_deposit'
  | 'savings_withdrawal';

export interface TransactionHistoryItem {
  id: string;
  type: TransactionType;
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
  source: 'repayment' | 'savings';
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Repayment)
    private readonly repaymentRepo: Repository<Repayment>,
    @InjectRepository(Savings)
    private readonly savingsRepo: Repository<Savings>,
  ) {}

  async getHistory(query: TransactionsQueryDto) {
    const {
      memberId,
      centerId,
      loanId,
      type = 'all',
      search,
      startDate,
      endDate,
      page = 1,
      limit = 25,
    } = query;

    const [repayments, savingsEntries] = await Promise.all([
      this.fetchRepayments({
        memberId,
        centerId,
        loanId,
        startDate,
        endDate,
        include: type === 'all' || type === 'repayment',
      }),
      this.fetchSavings({
        memberId,
        centerId,
        loanId,
        startDate,
        endDate,
        include:
          type === 'all' ||
          type === 'savings' ||
          type === 'savings_deposit' ||
          type === 'savings_withdrawal',
        savingsFilter: type,
      }),
    ]);

    const combined = [...repayments, ...savingsEntries];

    const normalizedSearch = search?.trim().toLowerCase();
    const filtered = combined.filter((entry) => {
      if (!normalizedSearch) return true;
      const memberName = entry.member.name.toLowerCase();
      const centerName = entry.member.center?.name?.toLowerCase() ?? '';
      return (
        memberName.includes(normalizedSearch) ||
        centerName.includes(normalizedSearch)
      );
    });

    filtered.sort((a, b) => {
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const items = filtered.slice(startIndex, startIndex + limit);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  private async fetchRepayments(params: {
    memberId?: string;
    centerId?: string;
    loanId?: string;
    startDate?: string;
    endDate?: string;
    include: boolean;
  }): Promise<TransactionHistoryItem[]> {
    const { include, memberId, centerId, loanId, startDate, endDate } = params;
    if (!include) {
      return [];
    }

    const qb = this.repaymentRepo
      .createQueryBuilder('repayment')
      .leftJoinAndSelect('repayment.member', 'member')
      .leftJoinAndSelect('member.center', 'center')
      .leftJoinAndSelect('repayment.loan', 'loan')
      .leftJoinAndSelect('repayment.center', 'repaymentCenter');

    if (memberId) {
      qb.andWhere('member.id = :memberId', { memberId });
    }

    if (centerId) {
      qb.andWhere(
        '(center.id = :centerId OR repaymentCenter.id = :centerId)',
        { centerId },
      );
    }

    if (loanId) {
      qb.andWhere('loan.id = :loanId', { loanId });
    }

    if (startDate) {
      const normalized = this.normalizeDate(startDate);
      if (normalized) {
        qb.andWhere('repayment.createdAt >= :startDate', {
          startDate: normalized,
        });
      }
    }

    if (endDate) {
      const normalized = this.normalizeDate(endDate, true);
      if (normalized) {
        qb.andWhere('repayment.createdAt <= :endDate', {
          endDate: normalized,
        });
      }
    }

    const rows = await qb.getMany();
    return rows.map((row) => this.mapRepayment(row));
  }

  private async fetchSavings(params: {
    memberId?: string;
    centerId?: string;
    loanId?: string;
    startDate?: string;
    endDate?: string;
    include: boolean;
    savingsFilter?: string;
  }): Promise<TransactionHistoryItem[]> {
    const {
      include,
      memberId,
      centerId,
      loanId,
      startDate,
      endDate,
      savingsFilter,
    } = params;
    if (!include) {
      return [];
    }

    const qb = this.savingsRepo
      .createQueryBuilder('savings')
      .leftJoinAndSelect('savings.borrower', 'member')
      .leftJoinAndSelect('member.center', 'center')
      .leftJoinAndSelect('savings.loan', 'loan');

    if (memberId) {
      qb.andWhere('member.id = :memberId', { memberId });
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
        qb.andWhere('savings.createdAt >= :startDate', { startDate: normalized });
      }
    }

    if (endDate) {
      const normalized = this.normalizeDate(endDate, true);
      if (normalized) {
        qb.andWhere('savings.createdAt <= :endDate', { endDate: normalized });
      }
    }

    if (savingsFilter === 'savings_deposit') {
      qb.andWhere('savings.amount > 0');
    } else if (savingsFilter === 'savings_withdrawal') {
      qb.andWhere('savings.amount < 0');
    }

    const rows = await qb.getMany();
    return rows.map((row) => this.mapSavings(row));
  }

  private mapRepayment(repayment: Repayment): TransactionHistoryItem {
    const amount = this.toNumber(repayment.amount);
    const memberName = `${repayment.member?.lastName ?? ''}, ${
      repayment.member?.firstName ?? ''
    }`.trim();
    return {
      id: repayment.id,
      type: 'repayment',
      amount,
      direction: 'credit',
      member: {
        id: repayment.member?.id ?? null,
        name: memberName || 'Unknown Member',
        center: {
          id:
            repayment.member?.center?.id ?? repayment.center?.id ?? null,
          name:
            repayment.member?.center?.name ?? repayment.center?.name ?? null,
        },
      },
      loan: {
        id: repayment.loan?.id ?? null,
        status: repayment.loan?.status ?? null,
      },
      notes: repayment.notes ?? null,
      createdAt: repayment.createdAt?.toISOString() ?? new Date().toISOString(),
      source: 'repayment',
    };
  }

  private mapSavings(savings: Savings): TransactionHistoryItem {
    const amount = this.toNumber(Math.abs(savings.amount));
    const type: TransactionType =
      this.toNumber(savings.amount) >= 0
        ? 'savings_deposit'
        : 'savings_withdrawal';
    const memberName = `${savings.borrower?.lastName ?? ''}, ${
      savings.borrower?.firstName ?? ''
    }`.trim();

    return {
      id: savings.id,
      type,
      amount,
      direction: type === 'savings_deposit' ? 'credit' : 'debit',
      member: {
        id: savings.borrower?.id ?? null,
        name: memberName || 'Unknown Member',
        center: {
          id: savings.borrower?.center?.id ?? null,
          name: savings.borrower?.center?.name ?? null,
        },
      },
      loan: {
        id: savings.loan?.id ?? null,
        status: savings.loan?.status ?? null,
      },
      notes: savings.remarks ?? null,
      createdAt: savings.createdAt?.toISOString() ?? new Date().toISOString(),
      source: 'savings',
    };
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

  private toNumber(value: unknown): number {
    if (value === null || value === undefined) {
      return 0;
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }
}

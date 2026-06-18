import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Loan } from '../../loans/loan.entity';

export enum LoanLedgerEntryType {
  DISBURSEMENT = 'disbursement',
  REPAYMENT = 'repayment',
  REPAYMENT_REVERSAL = 'repayment_reversal',
  PAST_DUE_INTEREST_ACCRUAL = 'past_due_interest_accrual',
  PENALTY_ACCRUAL = 'penalty_accrual',
  WAIVER = 'waiver',
  ADJUSTMENT = 'adjustment',
}

@Entity({ name: 'loan_ledger_entry' })
@Index('IDX_loan_ledger_entry_loan_posted_at', ['loanId', 'postedAt'])
@Index('IDX_loan_ledger_entry_type', ['entryType'])
export class LoanLedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  loanId: string;

  @ManyToOne(() => Loan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'loanId' })
  loan: Loan;

  @Column({ type: 'varchar', length: 64 })
  entryType: LoanLedgerEntryType;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  debit: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  credit: number;

  @Column('decimal', { precision: 12, scale: 2 })
  balanceAfter: number;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdById: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  postedAt: Date;

  @Column({ type: 'varchar', length: 64, nullable: true })
  referenceType: string | null;

  @Column({ type: 'uuid', nullable: true })
  referenceId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}

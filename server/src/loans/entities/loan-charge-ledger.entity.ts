import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Loan } from '../loan.entity';
import { Repayment } from '../../repayments/repayment.entity';
import { LoanRepaymentSchedule } from '../../repayments/entities/loan-repayment-schedule.entity';

export enum LoanChargeType {
  PAST_DUE_INTEREST = 'past_due_interest',
  PENALTY = 'penalty',
}

export enum LoanChargeLedgerEventType {
  ACCRUAL = 'accrual',
  PAYMENT = 'payment',
  PAYMENT_REVERSAL = 'payment_reversal',
}

@Entity('loan_charge_ledger')
@Index(['loanId', 'chargeType', 'eventType'])
@Index(['sourceRepaymentId'])
@Index(['idempotencyKey'], { unique: true })
export class LoanChargeLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  loanId: string;

  @ManyToOne(() => Loan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'loanId' })
  loan: Loan;

  @Column({ type: 'uuid', nullable: true })
  scheduleId: string | null;

  @ManyToOne(() => LoanRepaymentSchedule, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'scheduleId' })
  schedule: LoanRepaymentSchedule | null;

  @Column({
    type: 'enum',
    enum: LoanChargeType,
  })
  chargeType: LoanChargeType;

  @Column({
    type: 'enum',
    enum: LoanChargeLedgerEventType,
  })
  eventType: LoanChargeLedgerEventType;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  cashPortion: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  savingsPortion: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  baseAmount: number;

  @Column({ type: 'numeric', precision: 8, scale: 6, default: 0 })
  rate: number;

  @Column({ type: 'date', nullable: true })
  periodStart: string | null;

  @Column({ type: 'date', nullable: true })
  periodEnd: string | null;

  @Column({ type: 'uuid', nullable: true })
  sourceRepaymentId: string | null;

  @ManyToOne(() => Repayment, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sourceRepaymentId' })
  sourceRepayment: Repayment | null;

  @Column({ type: 'uuid', nullable: true })
  reversedLedgerEntryId: string | null;

  @ManyToOne(() => LoanChargeLedger, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reversedLedgerEntryId' })
  reversedLedgerEntry: LoanChargeLedger | null;

  @Column({ type: 'text' })
  idempotencyKey: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}

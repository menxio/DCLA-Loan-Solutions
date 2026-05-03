import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Loan } from '../loans/loan.entity';
import { Member } from '../members/entities/member.entity';
import { Center } from '../centers/entities/center.entity';
import { LoanRepaymentAllocation } from './entities/loan-repayment-allocation.entity';

@Entity()
export class Repayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Loan, { onDelete: 'CASCADE' })
  loan: Loan;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  member: Member;

  @ManyToOne(() => Center, { onDelete: 'CASCADE' })
  center: Center;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'date', nullable: true })
  paymentDate: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(
    () => LoanRepaymentAllocation,
    (allocation) => allocation.repayment,
  )
  allocations: LoanRepaymentAllocation[];
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Borrower } from '../borrowers/borrower.entity';

@Entity()
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Borrower, (borrower) => borrower.loans)
  borrower: Borrower;

  @Column('decimal', { precision: 12, scale: 2 })
  principalAmount: number;

  @Column('int')
  termWeeks: number;

  @Column('decimal', { precision: 5, scale: 2 })
  interestRate: number;

  @Column({ default: 'active' })
  status: 'active' | 'paid' | 'defaulted' | 'netoff' | 'payoff';

  @Column('decimal', { precision: 12, scale: 2 })
  weeklyPaymentAmount: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  amountPaid: number;

  @Column('decimal', { precision: 12, scale: 2 })
  balance: number;

  @Column({ nullable: true })
  remarks: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

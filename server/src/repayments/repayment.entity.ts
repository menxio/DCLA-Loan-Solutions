import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Loan } from '../loans/loan.entity';
import { Member } from '../members/entities/member.entity';
import { Center } from '../centers/entities/center.entity';

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

  @CreateDateColumn()
  createdAt: Date;
}

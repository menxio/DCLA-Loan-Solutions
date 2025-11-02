import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Member } from '../members/entities/member.entity';
import { Center } from '../centers/entities/center.entity';
import { Loan } from '../loans/loan.entity';

@Entity('activity_log')
@Index(['entityType', 'createdAt'])
@Index(['memberId', 'createdAt'])
@Index(['centerId', 'createdAt'])
@Index(['loanId', 'createdAt'])
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 40 })
  entityType: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  entityId: string | null;

  @Column({ type: 'uuid', nullable: true })
  memberId: string | null;

  @ManyToOne(() => Member, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'memberId' })
  member?: Member | null;

  @Column({ type: 'uuid', nullable: true })
  centerId: string | null;

  @ManyToOne(() => Center, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'centerId' })
  center?: Center | null;

  @Column({ type: 'uuid', nullable: true })
  loanId: string | null;

  @ManyToOne(() => Loan, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'loanId' })
  loan?: Loan | null;

  @Column({ length: 60 })
  action: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  amount: number | null;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any> | null;

  @Column({ type: 'uuid', nullable: true })
  performedByUserId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}

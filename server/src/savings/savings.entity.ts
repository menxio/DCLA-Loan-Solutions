import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Member } from '../members/entities/member.entity';

@Entity()
export class Savings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Member, (borrower) => borrower.savings)
  borrower: Member;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  remarks: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

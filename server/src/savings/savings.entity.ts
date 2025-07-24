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
export class Savings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Borrower, (borrower) => borrower.savings)
  borrower: Borrower;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  remarks: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

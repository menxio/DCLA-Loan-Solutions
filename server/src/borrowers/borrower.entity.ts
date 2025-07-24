import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Loan } from '../loans/loan.entity';
import { Savings } from '../savings/savings.entity';

@Entity()
export class Borrower {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  middleName: string;

  @Column()
  contactNumber: string;

  @Column()
  address: string;

  @Column({ nullable: true })
  birthDate: Date;

  @OneToMany(() => Loan, (loan) => loan.borrower)
  loans: Loan[];

  @OneToMany(() => Savings, (savings) => savings.borrower)
  savings: Savings[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

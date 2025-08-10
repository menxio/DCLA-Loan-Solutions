import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Loan } from '../../loans/loan.entity';
import { Savings } from '../../savings/savings.entity';
import { Center } from '../../centers/entities/center.entity';

@Entity()
export class Member {
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

  @ManyToOne(() => Center, { nullable: true })
  center: Center;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { Loan } from './loan.entity';
import { Member } from '../members/entities/member.entity';
import { Collection } from '../collections/entities/collection.entity';
import { LoanRepaymentSchedule } from '../repayments/entities/loan-repayment-schedule.entity';
import { Savings } from '../savings/savings.entity';
import { LoanWaiver } from './entities/loan-waiver.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Loan,
      Member,
      Collection,
      LoanRepaymentSchedule,
      Savings,
      LoanWaiver,
    ]),
  ],
  controllers: [LoansController],
  providers: [LoansService],
  exports: [LoansService],
})
export class LoansModule {}

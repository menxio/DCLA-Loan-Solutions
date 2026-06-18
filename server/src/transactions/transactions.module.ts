import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { Repayment } from '../repayments/repayment.entity';
import { Savings } from '../savings/savings.entity';
import { LoanAccountingModule } from '../loan-accounting/loan-accounting.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Repayment, Savings]),
    LoanAccountingModule,
  ],
  providers: [TransactionsService],
  controllers: [TransactionsController],
})
export class TransactionsModule {}

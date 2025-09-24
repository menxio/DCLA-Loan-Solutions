import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repayment } from './repayment.entity';
import { RepaymentsService } from './repayments.service';
import { RepaymentsController } from './repayments.controller';
import { Loan } from '../loans/loan.entity';
import { Member } from '../members/entities/member.entity';
import { Center } from '../centers/entities/center.entity';
import { Collection } from '../collections/entities/collection.entity';
import { LoansModule } from '../loans/loans.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Repayment, Loan, Member, Center, Collection]),
    LoansModule,
  ],
  providers: [RepaymentsService],
  controllers: [RepaymentsController],
  exports: [TypeOrmModule],
})
export class RepaymentsModule {}

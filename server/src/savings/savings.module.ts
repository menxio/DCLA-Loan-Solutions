import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavingsController } from './savings.controller';
import { SavingsService } from './savings.service';
import { Savings } from './savings.entity';
import { Member } from '../members/entities/member.entity';
import { Loan } from '../loans/loan.entity';
import { SavingsHistoryService } from './savings-history.service';

@Module({
  imports: [TypeOrmModule.forFeature([Savings, Member, Loan])],
  controllers: [SavingsController],
  providers: [SavingsService, SavingsHistoryService],
  exports: [SavingsService],
})
export class SavingsModule {}

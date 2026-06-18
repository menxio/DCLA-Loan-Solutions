import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoanLedgerEntry } from './entities/loan-ledger-entry.entity';
import { LoanAccountingService } from './loan-accounting.service';

@Module({
  imports: [TypeOrmModule.forFeature([LoanLedgerEntry])],
  providers: [LoanAccountingService],
  exports: [LoanAccountingService, TypeOrmModule],
})
export class LoanAccountingModule {}

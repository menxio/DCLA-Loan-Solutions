import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { Loan } from './loan.entity';
import { Member } from '../members/entities/member.entity';
import { Collection } from '../collections/entities/collection.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Loan, Member, Collection])],
  controllers: [LoansController],
  providers: [LoansService],
  exports: [LoansService],
})
export class LoansModule {}

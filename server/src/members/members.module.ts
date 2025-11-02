import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from './entities/member.entity';
import { Center } from '../centers/entities/center.entity';
import { Loan } from '../loans/loan.entity';
import { Repayment } from '../repayments/repayment.entity';
import { Savings } from '../savings/savings.entity';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Member, Center, Loan, Repayment, Savings]),
    ActivityModule,
  ],
  controllers: [MembersController],
  providers: [MembersService],
})
export class MembersModule {}

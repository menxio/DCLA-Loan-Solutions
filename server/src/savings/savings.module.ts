import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavingsController } from './savings.controller';
import { SavingsService } from './savings.service';
import { Savings } from './savings.entity';
import { Member } from '../members/entities/member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Savings, Member])],
  controllers: [SavingsController],
  providers: [SavingsService],
  exports: [SavingsService],
})
export class SavingsModule {}

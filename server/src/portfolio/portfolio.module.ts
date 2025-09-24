import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioService } from './portfolio.service';
import { PortfolioController } from './portfolio.controller';
import { Center } from '../centers/entities/center.entity';
import { Loan } from '../loans/loan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Center, Loan])],
  providers: [PortfolioService],
  controllers: [PortfolioController],
  exports: [PortfolioService],
})
export class PortfolioModule {}

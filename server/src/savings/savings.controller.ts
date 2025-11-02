import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SavingsService } from './savings.service';
import { DepositSavingsDto } from './dto/deposit-savings.dto';

@Controller('savings')
export class SavingsController {
  constructor(private readonly savingsService: SavingsService) {}

  @Post('deposit')
  deposit(@Body() dto: DepositSavingsDto) {
    return this.savingsService.deposit(dto);
  }

  @Get('member/:memberId')
  getMemberSavings(@Param('memberId') memberId: string) {
    return this.savingsService.findByMember(memberId);
  }
}

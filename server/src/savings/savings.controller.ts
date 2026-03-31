import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SavingsService } from './savings.service';
import { DepositSavingsDto } from './dto/deposit-savings.dto';
import { WithdrawSavingsDto } from './dto/withdraw-savings.dto';
import { ROLE } from '../auth/roles.constants';
import { Roles } from '../auth/roles.decorator';

@Controller('savings')
export class SavingsController {
  constructor(private readonly savingsService: SavingsService) {}

  @Roles(ROLE.Admin, ROLE.Manager, ROLE.Cashier)
  @Post('deposit')
  deposit(@Body() dto: DepositSavingsDto) {
    return this.savingsService.deposit(dto);
  }

  @Roles(ROLE.Admin, ROLE.Manager, ROLE.Cashier)
  @Post('withdraw')
  withdraw(@Body() dto: WithdrawSavingsDto) {
    return this.savingsService.withdraw(dto);
  }

  @Roles(ROLE.Admin, ROLE.Manager, ROLE.Cashier, ROLE.LoanProcessor)
  @Get('member/:memberId')
  getMemberSavings(@Param('memberId') memberId: string) {
    return this.savingsService.findByMember(memberId);
  }
}

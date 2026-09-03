import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { SavingsService } from './savings.service';
import { DepositSavingsDto } from './dto/deposit-savings.dto';
import { WithdrawSavingsDto } from './dto/withdraw-savings.dto';
import { ROLE } from '../auth/roles.constants';
import { Roles } from '../auth/roles.decorator';

@Controller('savings')
export class SavingsController {
  constructor(private readonly savingsService: SavingsService) {}

  @Roles(ROLE.Cashier)
  @Post('deposit')
  deposit(
    @Body() dto: DepositSavingsDto,
    @Req() req: { user?: { userId?: string } },
  ) {
    return this.savingsService.deposit(dto, req.user?.userId);
  }

  @Roles(ROLE.Cashier)
  @Post('withdraw')
  withdraw(
    @Body() dto: WithdrawSavingsDto,
    @Req() req: { user?: { userId?: string } },
  ) {
    return this.savingsService.withdraw(dto, req.user?.userId);
  }

  @Roles(ROLE.Manager, ROLE.Cashier, ROLE.LoanProcessor)
  @Get('member/:memberId')
  getMemberSavings(@Param('memberId') memberId: string) {
    return this.savingsService.findByMember(memberId);
  }
}

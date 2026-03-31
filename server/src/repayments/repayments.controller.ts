import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RepaymentsService } from './repayments.service';
import { ROLE } from '../auth/roles.constants';
import { Roles } from '../auth/roles.decorator';

@Controller('repayments')
export class RepaymentsController {
  constructor(private readonly repaymentsService: RepaymentsService) {}

  @Roles(ROLE.Admin, ROLE.Manager, ROLE.Cashier)
  @Post()
  create(
    @Body()
    body: {
      loanId: string;
      memberId: string;
      centerId: string;
      amount: number;
      collectionDate?: string;
      notes?: string;
      useSavings?: boolean;
    },
  ) {
    return this.repaymentsService.create(body);
  }

  @Roles(ROLE.Admin, ROLE.Manager, ROLE.Cashier, ROLE.LoanProcessor)
  @Get('loan/:id/schedule')
  getSchedule(@Param('id') id: string) {
    return this.repaymentsService.getScheduleForLoan(id);
  }
}

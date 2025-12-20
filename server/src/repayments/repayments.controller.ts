import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RepaymentsService } from './repayments.service';

@Controller('repayments')
export class RepaymentsController {
  constructor(private readonly repaymentsService: RepaymentsService) {}

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

  @Get('loan/:id/schedule')
  getSchedule(@Param('id') id: string) {
    return this.repaymentsService.getScheduleForLoan(id);
  }
}

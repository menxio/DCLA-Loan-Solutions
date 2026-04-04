import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { RepaymentsService } from './repayments.service';
import { ROLE } from '../auth/roles.constants';
import { Roles } from '../auth/roles.decorator';
import { RejectRepaymentDto } from './dto/reject-repayment.dto';
import { RequestRepaymentReversalDto } from './dto/request-repayment-reversal.dto';

@Controller('repayments')
export class RepaymentsController {
  constructor(private readonly repaymentsService: RepaymentsService) {}

  @Roles(ROLE.Cashier)
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
    @Req() req: { user?: { userId?: string; role?: string } },
  ) {
    return this.repaymentsService.create(body, req.user);
  }

  @Roles(ROLE.Cashier)
  @Post(':id/reversal-request')
  requestReversal(
    @Param('id') id: string,
    @Body() body: RequestRepaymentReversalDto,
    @Req() req: { user?: { userId?: string; role?: string } },
  ) {
    return this.repaymentsService.requestReversal(id, body, req.user);
  }

  @Roles(ROLE.Manager)
  @Get('pending')
  findPending() {
    return this.repaymentsService.findPendingRepayments();
  }

  @Roles(ROLE.Manager)
  @Post(':id/approve')
  approve(@Param('id') id: string, @Req() req: { user?: { userId?: string } }) {
    return this.repaymentsService.approveRepayment(id, req.user?.userId);
  }

  @Roles(ROLE.Manager)
  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() body: RejectRepaymentDto,
    @Req() req: { user?: { userId?: string } },
  ) {
    return this.repaymentsService.rejectRepayment(
      id,
      req.user?.userId,
      body.reason,
    );
  }

  @Roles(ROLE.Manager, ROLE.Cashier, ROLE.LoanProcessor)
  @Get('loan/:id/schedule')
  getSchedule(@Param('id') id: string) {
    return this.repaymentsService.getScheduleForLoan(id);
  }
}

import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { RepaymentsService } from './repayments.service';
import { ROLE } from '../auth/roles.constants';
import { Roles } from '../auth/roles.decorator';
import { RejectRepaymentDto } from './dto/reject-repayment.dto';

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
    @Req() req: { user?: { userId?: string; role?: string } },
  ) {
    return this.repaymentsService.create(body, req.user);
  }

  @Roles(ROLE.Admin, ROLE.Manager)
  @Get('pending')
  findPending() {
    return this.repaymentsService.findPendingRepayments();
  }

  @Roles(ROLE.Admin, ROLE.Manager)
  @Post(':id/approve')
  approve(@Param('id') id: string, @Req() req: { user?: { userId?: string } }) {
    return this.repaymentsService.approveRepayment(id, req.user?.userId);
  }

  @Roles(ROLE.Admin, ROLE.Manager)
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

  @Roles(ROLE.Admin, ROLE.Manager, ROLE.Cashier, ROLE.LoanProcessor)
  @Get('loan/:id/schedule')
  getSchedule(@Param('id') id: string) {
    return this.repaymentsService.getScheduleForLoan(id);
  }
}

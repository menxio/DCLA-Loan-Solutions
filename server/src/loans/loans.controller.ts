import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Req,
  Query,
} from '@nestjs/common';
import { LoansService } from './loans.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';
import { ReloanDto } from './dto/reloan.dto';
import { UpdateLoanTermDto } from './dto/update-loan-term.dto';
import { ApplyLoanWaiverDto } from './dto/apply-loan-waiver.dto';
import { FindMemberLoansQueryDto } from './dto/find-member-loans-query.dto';
import { PostLoanChargeSweepDto } from './dto/post-loan-charge-sweep.dto';
import { ROLE } from '../auth/roles.constants';
import { Roles } from '../auth/roles.decorator';

@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Roles(ROLE.LoanProcessor)
  @Post()
  create(@Body() createLoanDto: CreateLoanDto) {
    return this.loansService.create(createLoanDto);
  }

  @Roles(ROLE.Manager, ROLE.Cashier, ROLE.LoanProcessor)
  @Get()
  findAll() {
    return this.loansService.findAll();
  }

  @Roles(ROLE.Manager, ROLE.Cashier, ROLE.LoanProcessor)
  @Get('member/:id')
  findByMember(
    @Param('id') id: string,
    @Query() query: FindMemberLoansQueryDto,
  ) {
    return this.loansService.findByMember(id, query);
  }

  @Roles(ROLE.Manager)
  @Post('charges/sweep')
  postChargeSweep(@Body() body: PostLoanChargeSweepDto = {}) {
    return this.loansService.postOverdueChargesForActiveLoans(
      body.asOfDate,
    );
  }

  @Roles(ROLE.Manager)
  @Get('waivers/candidates')
  getWaiverCandidates() {
    return this.loansService.getWaiverCandidates();
  }

  @Roles(ROLE.Manager)
  @Get(':id/waivers')
  getWaiversByLoan(@Param('id') id: string) {
    return this.loansService.getWaiversByLoan(id);
  }

  @Roles(ROLE.Manager)
  @Post(':id/waivers')
  applyWaiver(
    @Param('id') id: string,
    @Body() body: ApplyLoanWaiverDto,
    @Req() req: { user?: { userId?: string } },
  ) {
    return this.loansService.applyWaiver(id, body, req.user?.userId);
  }

  @Roles(ROLE.Manager, ROLE.Cashier, ROLE.LoanProcessor)
  @Get(':id/charges')
  getChargeBreakdown(@Param('id') id: string) {
    return this.loansService.getChargeBreakdown(id);
  }

  @Roles(ROLE.Manager, ROLE.Cashier, ROLE.LoanProcessor)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.loansService.findOne(id);
  }

  // Eligibility by loan id (not just by member)
  @Roles(ROLE.Manager, ROLE.Cashier, ROLE.LoanProcessor)
  @Get(':id/eligibility')
  eligibilityByLoan(@Param('id') id: string) {
    return this.loansService.eligibilityByLoan(id);
  }

  // Create a reloan for an existing loan (net off or pay off)
  @Roles(ROLE.LoanProcessor)
  @Post(':id/reloan')
  reloan(@Param('id') id: string, @Body() body: ReloanDto) {
    return this.loansService.reloan(id, body);
  }

  @Roles(ROLE.LoanProcessor)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLoanDto: UpdateLoanDto) {
    return this.loansService.update(id, updateLoanDto);
  }

  @Roles(ROLE.LoanProcessor)
  @Patch(':id/term')
  updateTerm(@Param('id') id: string, @Body() body: UpdateLoanTermDto) {
    return this.loansService.updateTermWeeks(
      id,
      body.termWeeks,
      body.monthlyInterestRate,
    );
  }

  @Roles(ROLE.LoanProcessor)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.loansService.remove(id);
  }

  @Roles(ROLE.Manager, ROLE.Cashier, ROLE.LoanProcessor)
  @Get('member/:id/eligibility')
  checkEligibility(@Param('id') id: string) {
    return this.loansService.isEligibleForReloan(id);
  }
}

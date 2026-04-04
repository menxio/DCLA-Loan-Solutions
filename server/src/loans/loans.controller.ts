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
} from '@nestjs/common';
import { LoansService } from './loans.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';
import { ReloanDto } from './dto/reloan.dto';
import { UpdateLoanTermDto } from './dto/update-loan-term.dto';
import { ROLE } from '../auth/roles.constants';
import { Roles } from '../auth/roles.decorator';

@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Roles(ROLE.Admin, ROLE.Manager, ROLE.LoanProcessor)
  @Post()
  create(@Body() createLoanDto: CreateLoanDto) {
    return this.loansService.create(createLoanDto);
  }

  @Get()
  findAll() {
    return this.loansService.findAll();
  }

  @Get('member/:id')
  findByMember(@Param('id') id: string) {
    return this.loansService.findByMember(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.loansService.findOne(id);
  }

  // Eligibility by loan id (not just by member)
  @Get(':id/eligibility')
  eligibilityByLoan(@Param('id') id: string) {
    return this.loansService.eligibilityByLoan(id);
  }

  // Create a reloan for an existing loan (net off or pay off)
  @Roles(ROLE.Admin, ROLE.Manager)
  @Post(':id/reloan')
  reloan(@Param('id') id: string, @Body() body: ReloanDto) {
    return this.loansService.reloan(id, body);
  }

  @Roles(ROLE.Admin, ROLE.Manager)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLoanDto: UpdateLoanDto) {
    return this.loansService.update(id, updateLoanDto);
  }

  @Roles(ROLE.Admin, ROLE.Manager)
  @Patch(':id/term')
  updateTerm(
    @Param('id') id: string,
    @Body() body: UpdateLoanTermDto,
  ) {
    return this.loansService.updateTermWeeks(id, body.termWeeks);
  }

  @Roles(ROLE.Admin, ROLE.Manager)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.loansService.remove(id);
  }

  @Get('member/:id/eligibility')
  checkEligibility(@Param('id') id: string) {
    return this.loansService.isEligibleForReloan(id);
  }
}

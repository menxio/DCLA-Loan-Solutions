import { Controller, Get } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { ROLE } from '../auth/roles.constants';
import { Roles } from '../auth/roles.decorator';

@Roles(ROLE.Manager)
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  async getPortfolioData() {
    return this.portfolioService.getPortfolioData();
  }

  @Get('projected-income')
  async getProjectedIncomeData() {
    return this.portfolioService.getProjectedIncomeData();
  }
}

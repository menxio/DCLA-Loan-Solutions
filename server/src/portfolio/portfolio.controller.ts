import { Controller, Get } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';

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

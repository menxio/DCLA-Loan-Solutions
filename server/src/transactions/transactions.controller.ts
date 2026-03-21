import { Controller, Get, Query } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsQueryDto } from './dto/transactions-query.dto';
import { Roles } from '../auth/roles.decorator';

@Roles('admin')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  getHistory(@Query() query: TransactionsQueryDto) {
    return this.transactionsService.getHistory(query);
  }
}

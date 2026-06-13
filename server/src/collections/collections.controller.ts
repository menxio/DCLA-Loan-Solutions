import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { FindCollectionsQueryDto } from './dto/find-collections-query.dto';
import { ROLE } from '../auth/roles.constants';
import { Roles } from '../auth/roles.decorator';

@Controller('collection')
export class CollectionsController {
  constructor(private readonly collectionService: CollectionsService) {}

  @Roles(ROLE.LoanProcessor)
  @Post()
  create(@Body() createCollectionDto: CreateCollectionDto) {
    return this.collectionService.create(createCollectionDto);
  }

  @Roles(ROLE.Manager, ROLE.Cashier)
  @Get()
  findAll(@Query() query: FindCollectionsQueryDto) {
    return this.collectionService.findAll(query);
  }

  @Roles(ROLE.Manager, ROLE.Cashier)
  @Get('daily')
  getTodayCollections(@Query('date') date?: string) {
    return this.collectionService.getTodayCollections(date);
  }

  @Roles(ROLE.Manager, ROLE.Cashier)
  @Get('grouped')
  getAllCollectionsGrouped(@Query('date') date?: string) {
    return this.collectionService.getAllCollectionsGrouped(date);
  }

  @Roles(ROLE.Manager, ROLE.Cashier)
  @Get('date/:date')
  getCollectionsByDate(@Param('date') date: string) {
    return this.collectionService.getCollectionsByDate(date);
  }

  @Roles(ROLE.Manager, ROLE.Cashier)
  @Get('center/:centerId/date/:date')
  getCenterCollectionsByDate(
    @Param('centerId') centerId: string,
    @Param('date') date: string,
  ) {
    return this.collectionService.getCenterCollectionsByDate(centerId, date);
  }

  @Roles(ROLE.LoanProcessor)
  @Post('auto-generate')
  autoGenerateCollections(@Body() body: { centerId: string; date: string }) {
    return this.collectionService.autoGenerateCollections(
      body.centerId,
      body.date,
    );
  }

  @Roles(ROLE.Manager)
  @Get('stats')
  getCollectionStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.collectionService.getCollectionStats(startDate, endDate);
  }

  @Roles(ROLE.Cashier)
  @Patch(':id/payment')
  updatePayment(
    @Param('id') id: string,
    @Body() body: { paymentAmount: number; notes?: string },
  ) {
    return this.collectionService.updatePayment(id, body);
  }

  @Roles(ROLE.Manager, ROLE.Cashier)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.collectionService.findOne(id);
  }

  @Roles(ROLE.LoanProcessor)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCollectionDto: UpdateCollectionDto,
  ) {
    return this.collectionService.update(id, updateCollectionDto);
  }

  @Roles(ROLE.LoanProcessor)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.collectionService.remove(id);
  }
}

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

@Controller('collection')
export class CollectionsController {
  constructor(private readonly collectionService: CollectionsService) {}

  @Post()
  create(@Body() createCollectionDto: CreateCollectionDto) {
    return this.collectionService.create(createCollectionDto);
  }

  @Get()
  findAll(@Query() query: FindCollectionsQueryDto) {
    return this.collectionService.findAll(query);
  }

  @Get('daily')
  getTodayCollections() {
    return this.collectionService.getTodayCollections();
  }

  @Get('grouped')
  getAllCollectionsGrouped() {
    return this.collectionService.getAllCollectionsGrouped();
  }

  @Get('date/:date')
  getCollectionsByDate(@Param('date') date: string) {
    return this.collectionService.getCollectionsByDate(date);
  }

  @Get('center/:centerId/date/:date')
  getCenterCollectionsByDate(
    @Param('centerId') centerId: string,
    @Param('date') date: string,
  ) {
    return this.collectionService.getCenterCollectionsByDate(centerId, date);
  }

  @Post('auto-generate')
  autoGenerateCollections(@Body() body: { centerId: string; date: string }) {
    return this.collectionService.autoGenerateCollections(
      body.centerId,
      body.date,
    );
  }

  @Get('stats')
  getCollectionStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.collectionService.getCollectionStats(startDate, endDate);
  }

  @Patch(':id/payment')
  updatePayment(
    @Param('id') id: string,
    @Body() body: { paymentAmount: number; notes?: string },
  ) {
    return this.collectionService.updatePayment(id, body);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.collectionService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCollectionDto: UpdateCollectionDto,
  ) {
    return this.collectionService.update(id, updateCollectionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.collectionService.remove(id);
  }
}

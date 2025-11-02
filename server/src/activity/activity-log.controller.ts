import { Controller, Get, Query } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';
import { GetActivityQueryDto } from './dto/get-activity-query.dto';

@Controller('activity')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  findAll(@Query() query: GetActivityQueryDto) {
    return this.activityLogService.findAll(query);
  }
}

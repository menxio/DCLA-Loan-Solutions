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
import { CentersService } from './centers.service';
import { CreateCenterDto } from './dto/create-center.dto';
import { UpdateCenterDto } from './dto/update-center.dto';
import { FindCentersQueryDto } from './dto/find-centers-query.dto';
import { ROLE } from '../auth/roles.constants';
import { Roles } from '../auth/roles.decorator';

@Controller('centers')
export class CentersController {
  constructor(private readonly centersService: CentersService) {}

  @Roles(ROLE.Admin, ROLE.Manager, ROLE.LoanProcessor)
  @Post()
  create(@Body() createCenterDto: CreateCenterDto) {
    return this.centersService.create(createCenterDto);
  }

  @Get()
  findAll(@Query() query: FindCentersQueryDto) {
    return this.centersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.centersService.findOne(id);
  }

  @Roles(ROLE.Admin, ROLE.Manager, ROLE.LoanProcessor)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCenterDto: UpdateCenterDto) {
    return this.centersService.update(id, updateCenterDto);
  }

  @Roles(ROLE.Admin, ROLE.Manager, ROLE.LoanProcessor)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.centersService.remove(id);
  }
}

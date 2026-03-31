import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  Query,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { FindMembersQueryDto } from './dto/find-members-query.dto';
import { ROLE } from '../auth/roles.constants';
import { Roles } from '../auth/roles.decorator';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Roles(ROLE.Admin, ROLE.Manager, ROLE.LoanProcessor)
  @Post()
  create(@Body() createMemberDto: CreateMemberDto) {
    return this.membersService.create(createMemberDto);
  }

  @Get()
  findAll(@Query() query: FindMembersQueryDto) {
    return this.membersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.membersService.findOne(id); // removed +id
  }

  @Get('center/:centerId')
  getCenterMembers(@Param('centerId') centerId: string) {
    return this.membersService.getCenterMembers(centerId);
  }

  @Roles(ROLE.Admin, ROLE.Manager, ROLE.LoanProcessor)
  @Put(':id')
  update(@Param('id') id: string, @Body() updateMemberDto: UpdateMemberDto) {
    return this.membersService.update(id, updateMemberDto); // removed +id
  }

  @Roles(ROLE.Admin, ROLE.Manager, ROLE.LoanProcessor)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.membersService.remove(id); // removed +id
  }
}

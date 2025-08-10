import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from './entities/member.entity';
import { Center } from '../centers/entities/center.entity';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Member, Center])],
  controllers: [MembersController],
  providers: [MembersService],
})
export class MembersModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectionsService } from './collections.service';
import { CollectionsController } from './collections.controller';
import { Collection } from './entities/collection.entity';
import { Center } from '../centers/entities/center.entity';
import { Member } from '../members/entities/member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Collection, Center, Member])],
  controllers: [CollectionsController],
  providers: [CollectionsService],
  exports: [TypeOrmModule],
})
export class CollectionsModule {}

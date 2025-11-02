import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CentersService } from './centers.service';
import { CentersController } from './centers.controller';
import { Center } from './entities/center.entity';
import { Collection } from '../collections/entities/collection.entity';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [TypeOrmModule.forFeature([Center, Collection]), ActivityModule],
  controllers: [CentersController],
  providers: [CentersService],
})
export class CentersModule {}

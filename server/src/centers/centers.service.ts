import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Center } from './entities/center.entity';
import { CreateCenterDto } from './dto/create-center.dto';
import { UpdateCenterDto } from './dto/update-center.dto';
import { FindCentersQueryDto } from './dto/find-centers-query.dto';
import { ActivityLogService } from '../activity/activity-log.service';

@Injectable()
export class CentersService {
  constructor(
    @InjectRepository(Center)
    private readonly centerRepository: Repository<Center>,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async create(createCenterDto: CreateCenterDto): Promise<Center> {
    const center = this.centerRepository.create(createCenterDto);
    const saved = await this.centerRepository.save(center);

    await this.activityLogService.log({
      entityType: 'center',
      entityId: saved.id,
      centerId: saved.id,
      action: 'center_created',
      description: `Center ${saved.name} created`,
      payload: {
        centerName: saved.name,
        collectionDay: saved.collectionDay,
        leader: saved.leader,
      },
    });

    return saved;
  }

  async findAll(query?: FindCentersQueryDto): Promise<
    | Center[]
    | {
        items: Center[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }
  > {
    if (!query) {
      return this.centerRepository.find();
    }

    const { page = 1, limit = 10, search } = query;

    const qb = this.centerRepository.createQueryBuilder('center');

    if (search && search.trim().length > 0) {
      const term = `%${search.trim().toLowerCase()}%`;
      qb.where('LOWER(center.name) LIKE :term OR LOWER(center.address) LIKE :term', {
        term,
      });
    }

    qb.orderBy('center.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string): Promise<Center> {
    const center = await this.centerRepository.findOne({ where: { id } });
    if (!center) throw new NotFoundException(`Center #${id} not found`);
    return center;
  }

  async update(id: string, updateCenterDto: UpdateCenterDto): Promise<Center> {
    const center = await this.centerRepository.preload({
      id,
      ...updateCenterDto,
    });
    if (!center) throw new NotFoundException(`Center #${id} not found`);
    const saved = await this.centerRepository.save(center);

    await this.activityLogService.log({
      entityType: 'center',
      entityId: saved.id,
      centerId: saved.id,
      action: 'center_updated',
      description: `Center ${saved.name} updated`,
      payload: { centerName: saved.name, updates: updateCenterDto },
    });

    return saved;
  }

  async remove(id: string): Promise<void> {
    const center = await this.centerRepository.findOne({ where: { id } });
    if (!center) {
      throw new NotFoundException(`Center #${id} not found`);
    }

    await this.centerRepository.delete(id);

    await this.activityLogService.log({
      entityType: 'center',
      entityId: center.id,
      centerId: center.id,
      action: 'center_deleted',
      description: `Center ${center.name} deleted`,
      payload: { centerName: center.name },
    });
  }
}

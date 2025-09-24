import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Center } from './entities/center.entity';
import { CreateCenterDto } from './dto/create-center.dto';
import { UpdateCenterDto } from './dto/update-center.dto';
import { FindCentersQueryDto } from './dto/find-centers-query.dto';

@Injectable()
export class CentersService {
  constructor(
    @InjectRepository(Center)
    private readonly centerRepository: Repository<Center>,
  ) {}

  async create(createCenterDto: CreateCenterDto): Promise<Center> {
    const center = this.centerRepository.create(createCenterDto);
    return this.centerRepository.save(center);
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
    return this.centerRepository.save(center);
  }

  async remove(id: string): Promise<void> {
    const result = await this.centerRepository.delete(id);
    if (result.affected === 0)
      throw new NotFoundException(`Center #${id} not found`);
  }
}

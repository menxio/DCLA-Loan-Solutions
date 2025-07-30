import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Center } from './entities/center.entity';
import { CreateCenterDto } from './dto/create-center.dto';
import { UpdateCenterDto } from './dto/update-center.dto';

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

  async findAll(): Promise<Center[]> {
    return this.centerRepository.find();
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

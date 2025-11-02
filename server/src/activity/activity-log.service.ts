import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ActivityLog } from './activity-log.entity';
import { LogActivityDto } from './dto/log-activity.dto';
import { GetActivityQueryDto } from './dto/get-activity-query.dto';

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityRepository: Repository<ActivityLog>,
  ) {}

  async log(logDto: LogActivityDto): Promise<ActivityLog | null> {
    try {
      const record = this.activityRepository.create({
        entityType: logDto.entityType,
        entityId: logDto.entityId ?? null,
        memberId: logDto.memberId ?? null,
        centerId: logDto.centerId ?? null,
        loanId: logDto.loanId ?? null,
        action: logDto.action,
        description: logDto.description ?? null,
        amount:
          logDto.amount !== undefined && logDto.amount !== null
            ? Number(logDto.amount)
            : null,
        payload: logDto.payload ?? null,
        performedByUserId: logDto.performedByUserId ?? null,
      });
      return await this.activityRepository.save(record);
    } catch (error) {
      this.logger.error(
        `Failed to log activity: ${logDto.entityType}/${logDto.action}`,
        error.stack,
      );
      return null;
    }
  }

  async findAll(query: GetActivityQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<ActivityLog> = {};

    if (query.entityType) where.entityType = query.entityType;
    if (query.action) where.action = query.action;
    if (query.memberId) where.memberId = query.memberId;
    if (query.centerId) where.centerId = query.centerId;
    if (query.loanId) where.loanId = query.loanId;
    if (query.entityId) where.entityId = query.entityId;

    const qb = this.activityRepository
      .createQueryBuilder('activity')
      .where(where)
      .orderBy('activity.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.dateFrom) {
      qb.andWhere('activity.createdAt >= :dateFrom', { dateFrom: query.dateFrom });
    }

    if (query.dateTo) {
      qb.andWhere('activity.createdAt <= :dateTo', { dateTo: query.dateTo });
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

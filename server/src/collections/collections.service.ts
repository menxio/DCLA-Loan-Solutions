import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Collection } from './entities/collection.entity';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { Center } from '../centers/entities/center.entity';
import { Member } from '../members/entities/member.entity';
import { CollectionsRepository } from './collections.repository';
import { FindCollectionsQueryDto } from './dto/find-collections-query.dto';
import { Repayment } from '../repayments/repayment.entity';

@Injectable()
export class CollectionsService {
  private readonly logger = new Logger(CollectionsService.name);

  constructor(
    @InjectRepository(Collection)
    private readonly collectionRepo: Repository<Collection>,
    @InjectRepository(Center)
    private readonly centerRepo: Repository<Center>,
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
    @InjectRepository(Repayment)
    private readonly repaymentRepo: Repository<Repayment>,
    private readonly collectionsRepository: CollectionsRepository,
  ) {}

  private weekdayToIndex(weekday: string): number | null {
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const index = days.findIndex(
      (day) => day.toLowerCase() === weekday?.toLowerCase(),
    );
    return index === -1 ? null : index;
  }

  private getNextCollectionDate(collectionDay: string) {
    const targetIndex = this.weekdayToIndex(collectionDay);
    if (targetIndex === null) {
      return new Date().toISOString().split('T')[0];
    }

    const today = new Date();
    const diff = (targetIndex + 7 - today.getDay()) % 7;
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + diff);
    return nextDate.toISOString().split('T')[0];
  }

  private async calculateTotalReceivedForDate(centerId: string, date: string) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);

    const raw = await this.repaymentRepo
      .createQueryBuilder('repayment')
      .select('COALESCE(SUM(repayment.amount), 0)', 'total')
      .leftJoin('repayment.center', 'center')
      .where('center.id = :centerId', { centerId })
      .andWhere(
        'repayment.createdAt >= :start AND repayment.createdAt < :end',
        {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      )
      .getRawOne<{ total: string }>();

    return Number(raw?.total ?? 0);
  }

  async create(createCollectionDto: CreateCollectionDto) {
    const center = await this.centerRepo.findOneBy({
      id: createCollectionDto.centerId,
    });
    if (!center) throw new NotFoundException('Center not found');

    const member = await this.memberRepo.findOneBy({
      id: createCollectionDto.memberId,
    });
    if (!member) throw new NotFoundException('Member not found');

    const collection = this.collectionRepo.create({
      ...createCollectionDto,
      center,
      member,
    });
    return this.collectionRepo.save(collection);
  }

  async findAll(query: FindCollectionsQueryDto) {
    try {
      // Log the query for debugging
      this.logger.debug(
        `Searching collections with query: ${JSON.stringify(query)}`,
      );

      // Validate search parameter
      if (query.search && query.search.trim().length < 2) {
        throw new BadRequestException(
          'Search term must be at least 2 characters long',
        );
      }

      return await this.collectionsRepository.findAllWithQuery(query);
    } catch (err: any) {
      this.logger.error('Failed to fetch collections', err?.stack || err);

      // Re-throw BadRequestException with specific message
      if (err instanceof BadRequestException) {
        throw err;
      }

      // Generic error for other issues
      throw new BadRequestException(
        'Invalid query parameters: ' + (err.message || 'Unknown error'),
      );
    }
  }

  findOne(id: string) {
    return this.collectionRepo.findOne({
      where: { id },
      relations: ['center', 'member'],
    });
  }

  async update(id: string, updateDto: UpdateCollectionDto) {
    await this.collectionRepo.update(id, updateDto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.collectionRepo.delete(id);
    return { deleted: true };
  }

  /**
   * Get collections for a specific date
   */
  async getCollectionsByDate(date: string) {
    return this.collectionRepo.find({
      where: { collectionDate: date },
      relations: ['center', 'member'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get collections for a specific center on a specific date
   */
  async getCenterCollectionsByDate(centerId: string, date: string) {
    return this.collectionRepo.find({
      where: {
        centerId,
        collectionDate: date,
      },
      relations: ['center', 'member'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * DAILY COLLECTION LOGIC - Enhanced version
   */
  async getTodayCollections() {
    const today = new Date();
    const weekday = today.toLocaleString('en-US', { weekday: 'long' });
    const dateString = today.toISOString().split('T')[0];

    this.logger.log(`Getting collections for ${weekday} (${dateString})`);

    const centers = await this.centerRepo.find({
      where: { collectionDay: weekday },
    });

    const dailyCollections: any[] = [];

    for (const center of centers) {
      const existingCollections = await this.collectionRepo.find({
        where: {
          centerId: center.id,
          collectionDate: dateString,
        },
        relations: ['member'],
      });

      const centerMembers = await this.memberRepo.find({
        where: { center: { id: center.id } },
      });

      const centerCollectionList = {
        centerId: center.id,
        centerName: center.name,
        collectionDay: center.collectionDay,
        collectionDate: dateString,
        totalMembers: centerMembers.length,
        collections: existingCollections,
        pendingCollections: centerMembers.length - existingCollections.length,
        totalAmount: existingCollections.reduce(
          (sum, c) => sum + Number(c.amount),
          0,
        ),
        totalReceived: await this.calculateTotalReceivedForDate(
          center.id,
          dateString,
        ),
      };

      dailyCollections.push(centerCollectionList);
    }

    return dailyCollections;
  }

  async getAllCollectionsGrouped() {
    const centers = await this.centerRepo.find();
    const centerMap = new Map(centers.map((center) => [center.id, center]));

    const centerMembers = await this.memberRepo.find({
      relations: ['center'],
    });

    const membersMap = new Map<string, Member[]>();
    for (const member of centerMembers) {
      const memberCenterId = member.center?.id;
      if (!memberCenterId) continue;
      if (!membersMap.has(memberCenterId)) {
        membersMap.set(memberCenterId, []);
      }
      membersMap.get(memberCenterId)!.push(member);
    }

    const collections = await this.collectionRepo.find({
      relations: ['member'],
      order: { collectionDate: 'ASC', createdAt: 'ASC' },
    });

    const grouped = new Map<
      string,
      {
        centerId: string;
        collectionDate: string;
        collections: Collection[];
      }
    >();

    for (const collection of collections) {
      const key = `${collection.centerId}__${collection.collectionDate}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          centerId: collection.centerId,
          collectionDate: collection.collectionDate,
          collections: [],
        });
      }
      grouped.get(key)!.collections.push(collection);
    }

    const aggregated = await Promise.all(
      Array.from(grouped.values()).map(async (entry) => {
        const center = centerMap.get(entry.centerId);
        if (!center) {
          this.logger.warn(
            `Center ${entry.centerId} referenced in collections but not found`,
          );
          return null;
        }

        const members = membersMap.get(entry.centerId) ?? [];
        const totalAmount = entry.collections.reduce(
          (sum, c) => sum + Number(c.amount || 0),
          0,
        );
        const totalReceived = await this.calculateTotalReceivedForDate(
          entry.centerId,
          entry.collectionDate,
        );

        return {
          centerId: entry.centerId,
          centerName: center.name,
          collectionDay: center.collectionDay,
          collectionDate: entry.collectionDate,
          totalMembers: members.length,
          pendingCollections: Math.max(
            members.length - entry.collections.length,
            0,
          ),
          totalAmount,
          totalReceived,
          collections: entry.collections,
        };
      }),
    );

    const existingGroups = aggregated.filter(
      (group): group is NonNullable<typeof group> => Boolean(group),
    );

    const placeholders = centers
      .filter(
        (center) =>
          !existingGroups.some((group) => group.centerId === center.id),
      )
      .map((center) => {
        const members = membersMap.get(center.id) ?? [];
        return {
          centerId: center.id,
          centerName: center.name,
          collectionDay: center.collectionDay,
          collectionDate: this.getNextCollectionDate(center.collectionDay),
          totalMembers: members.length,
          pendingCollections: members.length,
          totalAmount: 0,
          totalReceived: 0,
          collections: [],
        };
      });

    const allGroups = [...existingGroups, ...placeholders];

    const today = new Date();
    const todayMs = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    ).getTime();

    return allGroups.sort((a, b) => {
      const aTime = new Date(a.collectionDate).getTime();
      const bTime = new Date(b.collectionDate).getTime();

      const aDiff = Math.abs(aTime - todayMs);
      const bDiff = Math.abs(bTime - todayMs);

      if (aDiff === bDiff) {
        if (aTime === bTime) {
          return a.centerName.localeCompare(b.centerName);
        }
        return aTime - bTime;
      }

      return aDiff - bDiff;
    });
  }

  /**
   * Auto-generate collections for a specific date and center
   */
  async autoGenerateCollections(centerId: string, date: string) {
    const center = await this.centerRepo.findOne({
      where: { id: centerId },
    });

    if (!center) {
      throw new NotFoundException('Center not found');
    }

    const existingCollections = await this.collectionRepo.find({
      where: { centerId, collectionDate: date },
    });

    if (existingCollections.length > 0) {
      throw new BadRequestException(
        `Collections already exist for ${date} in center ${center.name}`,
      );
    }

    const centerMembers = await this.memberRepo.find({
      where: { center: { id: centerId } },
    });

    const collections: any[] = [];
    for (const member of centerMembers) {
      const defaultAmount = 100;

      const collection = this.collectionRepo.create({
        centerId,
        memberId: member.id,
        collectionDate: date,
        amount: defaultAmount,
        netRelease: 0,
        paymentReceived: 0,
        isAutoGenerated: true,
        notes: 'Auto-generated collection',
        numberOfPayments: 0,
        advancePaymentAmount: 0,
        advancePaymentStatus: 'none' as any,
      });

      collections.push(collection);
    }

    const savedCollections = await this.collectionRepo.save(collections);

    this.logger.log(
      `Auto-generated ${savedCollections.length} collections for center ${center.name} on ${date}`,
    );

    return savedCollections;
  }

  /**
   * Get collection statistics for a date range
   */
  async getCollectionStats(startDate: string, endDate: string) {
    const collections = await this.collectionRepo.find({
      where: {
        collectionDate: Between(startDate, endDate),
      },
      relations: ['center', 'member'],
    });

    const stats = {
      totalCollections: collections.length,
      totalAmount: collections.reduce((sum, c) => sum + Number(c.amount), 0),
      totalReceived: collections.reduce(
        (sum, c) => sum + Number(c.paymentReceived),
        0,
      ),
      pendingAmount: collections
        .filter((c) => c.paymentReceived < c.amount)
        .reduce(
          (sum, c) => sum + (Number(c.amount) - Number(c.paymentReceived)),
          0,
        ),
      paidCollections: collections.filter((c) => c.paymentReceived >= c.amount)
        .length,
      pendingCollections: collections.filter(
        (c) => c.paymentReceived < c.amount,
      ).length,
    };

    return stats;
  }

  /**
   * Update collection payment
   */
  async updatePayment(
    id: string,
    paymentData: { paymentAmount: number; notes?: string },
  ) {
    const collection = await this.findOne(id);
    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    // Get the member's active loan to get the cumulative amount paid
    const member = await this.memberRepo.findOne({
      where: { id: collection.memberId },
      relations: ['loans'],
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const activeLoan = member.loans?.find((loan) => loan.status === 'active');
    if (!activeLoan) {
      throw new NotFoundException('No active loan found for member');
    }

    // Set paymentReceived to the cumulative amount paid from the loan
    const cumulativeAmountPaid = Number(activeLoan.amountPaid) || 0;

    const updateData: UpdateCollectionDto = {
      paymentReceived: cumulativeAmountPaid,
      notes: paymentData.notes || collection.notes,
    };

    return this.update(id, updateData);
  }
}

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
    private readonly collectionsRepository: CollectionsRepository,
  ) {}

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
        totalReceived: existingCollections.reduce(
          (sum, c) => sum + Number(c.paymentReceived),
          0,
        ),
      };

      dailyCollections.push(centerCollectionList);
    }

    return dailyCollections;
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

    const newPaymentReceived =
      Number(collection.paymentReceived) + paymentData.paymentAmount;

    const updateData: UpdateCollectionDto = {
      paymentReceived: newPaymentReceived,
      notes: paymentData.notes || collection.notes,
    };

    return this.update(id, updateData);
  }
}

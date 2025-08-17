import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Collection } from './entities/collection.entity';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { Center } from '../centers/entities/center.entity';
import { Member } from '../members/entities/member.entity';

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
  ) {}

  async create(createCollectionDto: CreateCollectionDto) {
    const center = await this.centerRepo.findOneBy({
      id: createCollectionDto.centerId,
    });
    if (!center) throw new Error('Center not found');

    const member = await this.memberRepo.findOneBy({
      id: createCollectionDto.memberId,
    });
    if (!member) throw new Error('Member not found');

    const collection = this.collectionRepo.create({
      ...createCollectionDto,
      center,
      member,
    });
    return this.collectionRepo.save(collection);
  }

  findAll() {
    return this.collectionRepo.find({
      relations: ['center', 'member'],
      order: { collectionDate: 'DESC' },
    });
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
    const weekday = today.toLocaleString('en-US', { weekday: 'long' }); // e.g. "Monday"
    const dateString = today.toISOString().split('T')[0];

    this.logger.log(`Getting collections for ${weekday} (${dateString})`);

    // Find centers that collect on this day
    const centers = await this.centerRepo.find({
      where: { collectionDay: weekday },
    });

    const dailyCollections: any[] = [];

    for (const center of centers) {
      // Get existing collections for today
      const existingCollections = await this.collectionRepo.find({
        where: {
          centerId: center.id,
          collectionDate: dateString,
        },
        relations: ['member'],
      });

      // Get all members for this center
      const centerMembers = await this.memberRepo.find({
        where: { center: { id: center.id } },
      });

      // Create collection list for today
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
      throw new Error('Center not found');
    }

    // Check if collections already exist for this date
    const existingCollections = await this.collectionRepo.find({
      where: { centerId, collectionDate: date },
    });

    if (existingCollections.length > 0) {
      throw new Error(
        `Collections already exist for ${date} in center ${center.name}`,
      );
    }

    // Get all members for this center
    const centerMembers = await this.memberRepo.find({
      where: { center: { id: centerId } },
    });

    // Generate collections for each member
    const collections: any[] = [];
    for (const member of centerMembers) {
      // You can customize the default amount based on your business logic
      const defaultAmount = 100; // Default collection amount

      const collection = this.collectionRepo.create({
        centerId,
        memberId: member.id,
        collectionDate: date,
        amount: defaultAmount,
        netRelease: 0,
        paymentReceived: 0,
        isAutoGenerated: true,
        notes: 'Auto-generated collection',
      });

      collections.push(collection);
    }

    // Save all collections
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
  async updatePayment(id: string, paymentAmount: number, notes?: string) {
    const collection = await this.findOne(id);
    if (!collection) {
      throw new Error('Collection not found');
    }

    const newPaymentReceived =
      Number(collection.paymentReceived) + paymentAmount;

    const updateData: UpdateCollectionDto = {
      paymentReceived: newPaymentReceived,
      notes: notes || collection.notes,
    };

    return this.update(id, updateData);
  }
}

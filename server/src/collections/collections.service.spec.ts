import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CollectionsService } from './collections.service';
import { Collection } from './entities/collection.entity';
import { Center } from '../centers/entities/center.entity';
import { Member } from '../members/entities/member.entity';
import { Repayment } from '../repayments/repayment.entity';
import { CollectionsRepository } from './collections.repository';

describe('CollectionsService', () => {
  let service: CollectionsService;
  let collectionRepo: { find: jest.Mock };
  let centerRepo: { find: jest.Mock };
  let memberRepo: { createQueryBuilder: jest.Mock };
  let repaymentRepo: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    collectionRepo = { find: jest.fn() };
    centerRepo = { find: jest.fn() };
    memberRepo = { createQueryBuilder: jest.fn() };
    repaymentRepo = { createQueryBuilder: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionsService,
        { provide: getRepositoryToken(Collection), useValue: collectionRepo },
        { provide: getRepositoryToken(Center), useValue: centerRepo },
        { provide: getRepositoryToken(Member), useValue: memberRepo },
        { provide: getRepositoryToken(Repayment), useValue: repaymentRepo },
        { provide: CollectionsRepository, useValue: {} },
      ],
    }).compile();

    service = module.get<CollectionsService>(CollectionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it.each([
    ['2026-09-07', 'Monday'],
    ['2026-09-08', 'Tuesday'],
  ])('uses the host-independent weekday for %s', async (date, weekday) => {
    centerRepo.find.mockResolvedValue([]);

    await service.getTodayCollections(date);

    expect(centerRepo.find).toHaveBeenCalledWith({
      where: { collectionDay: weekday },
    });
  });

  it.each(['2026-02-29', '2026-09-31', '2026-13-01', 'invalid'])(
    'rejects invalid collection date %s with a standard bad request',
    async (date) => {
      await expect(service.getTodayCollections(date)).rejects.toThrow(
        'Invalid collection date. Expected a valid YYYY-MM-DD date.',
      );
      expect(centerRepo.find).not.toHaveBeenCalled();
    },
  );

  it('queries Daily collections with the exact supplied database date', async () => {
    const memberQuery = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    const repaymentQuery = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    centerRepo.find.mockResolvedValue([
      { id: 'center-1', name: 'Alpha', collectionDay: 'Monday' },
    ]);
    collectionRepo.find.mockResolvedValue([]);
    memberRepo.createQueryBuilder.mockReturnValue(memberQuery);
    repaymentRepo.createQueryBuilder.mockReturnValue(repaymentQuery);

    const groups = await service.getTodayCollections('2026-09-07');

    expect(collectionRepo.find).toHaveBeenCalledWith({
      where: expect.objectContaining({ collectionDate: '2026-09-07' }),
      relations: ['member'],
    });
    expect(groups).toEqual([
      expect.objectContaining({
        collectionDate: '2026-09-07',
        collectionDay: 'Monday',
      }),
    ]);
  });

  it('builds dated groups with four fixed queries and count projections', async () => {
    const memberQuery = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest
        .fn()
        .mockResolvedValue([{ centerId: 'center-1', count: '3' }]),
    };
    const repaymentQuery = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest
        .fn()
        .mockResolvedValue([{ centerId: 'center-1', total: '125' }]),
    };
    centerRepo.find.mockResolvedValue([
      { id: 'center-1', name: 'Alpha', collectionDay: 'Friday' },
    ]);
    collectionRepo.find.mockResolvedValue([
      {
        id: 'collection-1',
        centerId: 'center-1',
        memberId: 'member-1',
        collectionDate: '2026-09-04',
        amount: 200,
      },
    ]);
    memberRepo.createQueryBuilder.mockReturnValue(memberQuery);
    repaymentRepo.createQueryBuilder.mockReturnValue(repaymentQuery);

    const groups = await service.getAllCollectionsGrouped('2026-09-04');

    expect(centerRepo.find).toHaveBeenCalledTimes(1);
    expect(collectionRepo.find).toHaveBeenCalledTimes(1);
    expect(collectionRepo.find).toHaveBeenCalledWith({
      where: { collectionDate: '2026-09-04' },
      relations: ['member'],
      order: { collectionDate: 'ASC', createdAt: 'ASC' },
    });
    expect(memberQuery.getRawMany).toHaveBeenCalledTimes(1);
    expect(repaymentQuery.getRawMany).toHaveBeenCalledTimes(1);
    expect(groups).toEqual([
      expect.objectContaining({
        centerId: 'center-1',
        totalMembers: 3,
        pendingCollections: 2,
        totalAmount: 200,
        totalReceived: 125,
      }),
    ]);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CollectionsService } from './collections.service';
import { Collection } from './entities/collection.entity';
import { Center } from '../centers/entities/center.entity';
import { Member } from '../members/entities/member.entity';
import { Repayment } from '../repayments/repayment.entity';
import { CollectionsRepository } from './collections.repository';
import { BusinessTimeService } from '../common/business-time/business-time.service';
import { ConfigService } from '@nestjs/config';

const createMockRepository = () => ({});

describe('CollectionsService', () => {
  let service: CollectionsService;

  afterEach(() => jest.useRealTimers());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionsService,
        { provide: getRepositoryToken(Collection), useValue: createMockRepository() },
        { provide: getRepositoryToken(Center), useValue: createMockRepository() },
        { provide: getRepositoryToken(Member), useValue: createMockRepository() },
        { provide: getRepositoryToken(Repayment), useValue: createMockRepository() },
        { provide: CollectionsRepository, useValue: {} },
        BusinessTimeService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => 'Asia/Manila') },
        },
      ],
    }).compile();

    service = module.get<CollectionsService>(CollectionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('uses the Manila date and weekday independent of the host date', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-28T16:30:00Z'));
    const internal = service as unknown as {
      resolveTargetDate(dateInput?: string): string;
      getNextCollectionDate(collectionDay: string): string;
    };

    expect(internal.resolveTargetDate()).toBe('2026-08-29');
    expect(internal.getNextCollectionDate('Sunday')).toBe('2026-08-30');
  });
});

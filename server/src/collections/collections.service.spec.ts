import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CollectionsService } from './collections.service';
import { Collection } from './entities/collection.entity';
import { Center } from '../centers/entities/center.entity';
import { Member } from '../members/entities/member.entity';
import { Repayment } from '../repayments/repayment.entity';
import { CollectionsRepository } from './collections.repository';

const createMockRepository = () => ({});

describe('CollectionsService', () => {
  let service: CollectionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionsService,
        { provide: getRepositoryToken(Collection), useValue: createMockRepository() },
        { provide: getRepositoryToken(Center), useValue: createMockRepository() },
        { provide: getRepositoryToken(Member), useValue: createMockRepository() },
        { provide: getRepositoryToken(Repayment), useValue: createMockRepository() },
        { provide: CollectionsRepository, useValue: {} },
      ],
    }).compile();

    service = module.get<CollectionsService>(CollectionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

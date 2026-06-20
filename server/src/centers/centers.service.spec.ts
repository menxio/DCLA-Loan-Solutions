import { Test, TestingModule } from '@nestjs/testing';
import { CentersService } from './centers.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Center } from './entities/center.entity';
import { Member } from '../members/entities/member.entity';

describe('CentersService', () => {
  let service: CentersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CentersService,
        { provide: getRepositoryToken(Center), useValue: {} },
        { provide: getRepositoryToken(Member), useValue: {} },
      ],
    }).compile();

    service = module.get<CentersService>(CentersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

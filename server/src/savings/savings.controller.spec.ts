import { Test, TestingModule } from '@nestjs/testing';
import { SavingsController } from './savings.controller';
import { SavingsService } from './savings.service';

describe('SavingsController', () => {
  let controller: SavingsController;
  let service: {
    deposit: jest.Mock;
    withdraw: jest.Mock;
    findByMember: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      deposit: jest.fn(),
      withdraw: jest.fn(),
      findByMember: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SavingsController],
      providers: [
        {
          provide: SavingsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<SavingsController>(SavingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it.each(['deposit', 'withdraw'] as const)(
    'uses the authenticated actor for %s and does not accept a body override',
    async (operation) => {
      const dto = {
        memberId: 'member-1',
        loanId: 'loan-1',
        amount: 100,
        performedById: 'spoofed-actor',
      };
      service[operation].mockResolvedValue({ ok: true });

      await controller[operation](dto, {
        user: { userId: 'authenticated-actor' },
      });

      expect(service[operation]).toHaveBeenCalledWith(
        dto,
        'authenticated-actor',
      );
    },
  );
});

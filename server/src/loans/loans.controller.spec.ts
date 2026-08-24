import { Test, TestingModule } from '@nestjs/testing';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';

describe('LoansController', () => {
  let controller: LoansController;
  const loansService = { postOverdueChargesForActiveLoans: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoansController],
      providers: [{ provide: LoansService, useValue: loansService }],
    }).compile();

    controller = module.get<LoansController>(LoansController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('lets the service resolve a missing manual-sweep date in Manila', () => {
    void controller.postChargeSweep({});

    expect(loansService.postOverdueChargesForActiveLoans).toHaveBeenCalledWith(
      undefined,
    );
  });
});

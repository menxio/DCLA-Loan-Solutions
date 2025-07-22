import { Test, TestingModule } from '@nestjs/testing';
import { BorrowersController } from './borrowers.controller';

describe('BorrowersController', () => {
  let controller: BorrowersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BorrowersController],
    }).compile();

    controller = module.get<BorrowersController>(BorrowersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

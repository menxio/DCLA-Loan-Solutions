import { Test, TestingModule } from '@nestjs/testing';
import { MembersService } from './members.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Member } from './entities/member.entity';
import { Center } from '../centers/entities/center.entity';
import { Loan } from '../loans/loan.entity';
import { Repayment } from '../repayments/repayment.entity';
import { Savings } from '../savings/savings.entity';
import { Collection } from '../collections/entities/collection.entity';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('MembersService', () => {
  let service: MembersService;
  let manager: {
    findOne: jest.Mock;
    exists: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    manager = {
      findOne: jest.fn().mockResolvedValue({ id: 'member-1' } as Member),
      exists: jest.fn().mockResolvedValue(false),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const dataSource = {
      transaction: jest.fn(
        (callback: (entityManager: typeof manager) => unknown) =>
          callback(manager),
      ),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: getRepositoryToken(Member), useValue: {} },
        { provide: getRepositoryToken(Center), useValue: {} },
        { provide: getRepositoryToken(Loan), useValue: {} },
        { provide: getRepositoryToken(Repayment), useValue: {} },
        { provide: getRepositoryToken(Savings), useValue: {} },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects deletion without deleting a member savings history', async () => {
    manager.exists.mockImplementation((entity) =>
      Promise.resolve(entity === Savings),
    );

    await expect(service.remove('member-1')).rejects.toThrow(ConflictException);

    expect(manager.delete).not.toHaveBeenCalled();
  });

  it.each([
    ['loan', Loan],
    ['repayment', Repayment],
  ])(
    'rejects deletion when a member has %s history',
    async (_label, entity) => {
      manager.exists.mockImplementation((candidate) =>
        Promise.resolve(candidate === entity),
      );

      await expect(service.remove('member-1')).rejects.toThrow(
        'Member cannot be deleted because financial history exists',
      );

      expect(manager.delete).not.toHaveBeenCalled();
    },
  );

  it('rejects deletion when a member has collection history', async () => {
    manager.exists.mockImplementation((entity) =>
      Promise.resolve(entity === Collection),
    );

    await expect(service.remove('member-1')).rejects.toThrow(ConflictException);

    expect(manager.delete).not.toHaveBeenCalled();
  });

  it('hard deletes only the pristine member row', async () => {
    await service.remove('member-1');

    expect(manager.findOne).toHaveBeenCalledWith(Member, {
      where: { id: 'member-1' },
      lock: { mode: 'pessimistic_write' },
    });
    expect(manager.delete).toHaveBeenCalledTimes(1);
    expect(manager.delete).toHaveBeenCalledWith(Member, { id: 'member-1' });
  });

  it('preserves the not-found behavior', async () => {
    manager.findOne.mockResolvedValue(null);

    await expect(service.remove('missing-member')).rejects.toThrow(
      NotFoundException,
    );

    expect(manager.exists).not.toHaveBeenCalled();
    expect(manager.delete).not.toHaveBeenCalled();
  });
});

import { ConfigService } from '@nestjs/config';
import { BusinessTimeService } from '../common/business-time/business-time.service';
import { LoansService } from '../loans/loans.service';
import { RepaymentsService } from './repayments.service';

describe('RepaymentsService business dates', () => {
  const businessTime = new BusinessTimeService({
    get: () => 'Asia/Manila',
  } as unknown as ConfigService);
  const service = new RepaymentsService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as LoansService,
    businessTime,
  );
  const internal = service as unknown as {
    normalizeCollectionDate(collectionDate?: string): string;
  };

  afterEach(() => jest.useRealTimers());

  it('defaults a missing repayment date to the current Manila date', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-28T16:30:00Z'));

    expect(internal.normalizeCollectionDate()).toBe('2026-08-29');
  });

  it('converts an offset-bearing repayment instant to its Manila date', () => {
    expect(
      internal.normalizeCollectionDate('2026-08-28T16:00:00Z'),
    ).toBe('2026-08-29');
  });
});

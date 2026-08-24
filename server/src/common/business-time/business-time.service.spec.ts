import { ConfigService } from '@nestjs/config';
import {
  assertValidTimeZone,
  BusinessTimeService,
  validateBusinessTimeEnvironment,
} from './business-time.service';

describe('BusinessTimeService', () => {
  const service = new BusinessTimeService({
    get: () => 'Asia/Manila',
  } as unknown as ConfigService);

  it('distinguishes the exact Saturday Manila boundary', () => {
    expect(
      service.toBusinessDate(new Date('2026-08-28T15:59:59Z')),
    ).toBe('2026-08-28');
    expect(
      service.toBusinessDate(new Date('2026-08-28T16:00:00Z')),
    ).toBe('2026-08-29');
  });

  it('preserves date-only calendar values', () => {
    expect(service.toBusinessDate('2026-08-29')).toBe('2026-08-29');
    expect(service.addCalendarDays('2026-08-29', 1)).toBe('2026-08-30');
  });

  it('rejects ambiguous timestamps without an offset', () => {
    expect(() => service.toBusinessDate('2026-08-29T00:00:00')).toThrow(
      'Ambiguous business timestamp',
    );
  });

  it('defaults and validates APP_TIME_ZONE', () => {
    expect(validateBusinessTimeEnvironment({}).APP_TIME_ZONE).toBe(
      'Asia/Manila',
    );
    expect(() => assertValidTimeZone('Not/A_Time_Zone')).toThrow(
      'Invalid APP_TIME_ZONE',
    );
  });
});

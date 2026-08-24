import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const DEFAULT_BUSINESS_TIME_ZONE = 'Asia/Manila';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const OFFSET_TIMESTAMP_PATTERN = /(?:Z|[+-]\d{2}:?\d{2})$/i;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function assertValidTimeZone(timeZone: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date(0));
  } catch {
    throw new Error(`Invalid APP_TIME_ZONE: ${timeZone}`);
  }
}

export function validateBusinessTimeEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  const configured = environment.APP_TIME_ZONE;
  const timeZone =
    typeof configured === 'string' && configured.trim()
      ? configured.trim()
      : DEFAULT_BUSINESS_TIME_ZONE;

  assertValidTimeZone(timeZone);
  return { ...environment, APP_TIME_ZONE: timeZone };
}

@Injectable()
export class BusinessTimeService {
  readonly timeZone: string;

  constructor(configService: ConfigService) {
    this.timeZone =
      configService.get<string>('APP_TIME_ZONE') ?? DEFAULT_BUSINESS_TIME_ZONE;
    assertValidTimeZone(this.timeZone);
  }

  currentBusinessDate(now: Date = new Date()): string {
    return this.instantToBusinessDate(now);
  }

  toBusinessDate(input?: Date | string | null): string {
    if (input === undefined || input === null) {
      return this.currentBusinessDate();
    }

    if (typeof input === 'string') {
      if (DATE_ONLY_PATTERN.test(input)) {
        return this.assertCalendarDate(input);
      }
      if (!OFFSET_TIMESTAMP_PATTERN.test(input)) {
        throw new Error(
          `Ambiguous business timestamp without UTC offset: ${input}`,
        );
      }
      return this.instantToBusinessDate(new Date(input));
    }

    return this.instantToBusinessDate(input);
  }

  instantToBusinessDate(instant: Date): string {
    if (Number.isNaN(instant.getTime())) {
      throw new Error('Invalid business instant');
    }

    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(instant);
    const values = new Map(parts.map((part) => [part.type, part.value]));

    return this.assertCalendarDate(
      `${values.get('year')}-${values.get('month')}-${values.get('day')}`,
    );
  }

  addCalendarDays(date: string, days: number): string {
    const value = this.calendarDateToDate(date);
    value.setUTCDate(value.getUTCDate() + days);
    return this.dateToCalendarDate(value);
  }

  calendarDayOfWeek(date: string): number {
    return this.calendarDateToDate(date).getUTCDay();
  }

  differenceInCalendarDays(startDate: string, endDate: string): number {
    return Math.floor(
      (this.calendarDateToDate(endDate).getTime() -
        this.calendarDateToDate(startDate).getTime()) /
        MILLISECONDS_PER_DAY,
    );
  }

  compareCalendarDates(left: string, right: string): number {
    return this.assertCalendarDate(left).localeCompare(
      this.assertCalendarDate(right),
    );
  }

  calendarDateToDate(date: string): Date {
    const normalized = this.assertCalendarDate(date);
    const [year, month, day] = normalized
      .split('-')
      .map((value) => Number(value));
    return new Date(Date.UTC(year, month - 1, day));
  }

  dateToCalendarDate(date: Date): string {
    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid calendar date');
    }
    return [
      String(date.getUTCFullYear()).padStart(4, '0'),
      String(date.getUTCMonth() + 1).padStart(2, '0'),
      String(date.getUTCDate()).padStart(2, '0'),
    ].join('-');
  }

  private assertCalendarDate(date: string): string {
    if (!DATE_ONLY_PATTERN.test(date)) {
      throw new Error(`Invalid calendar date: ${date}`);
    }

    const [year, month, day] = date.split('-').map((value) => Number(value));
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      throw new Error(`Invalid calendar date: ${date}`);
    }

    return date;
  }
}

import { parseDateOnly } from './date-only';

describe('parseDateOnly', () => {
  it.each([
    ['2026-09-07', 'Monday'],
    ['2026-09-08', 'Tuesday'],
    ['2024-02-29', 'Thursday'],
  ])(
    'parses %s as %s without changing its database value',
    (value, weekday) => {
      expect(parseDateOnly(value)).toEqual(
        expect.objectContaining({ value, weekday }),
      );
    },
  );

  it.each(['2026-02-29', '2026-09-31', '2026-13-01', '2026-9-07', 'invalid'])(
    'rejects invalid date-only input %s',
    (value) => {
      expect(() => parseDateOnly(value)).toThrow(RangeError);
    },
  );
});

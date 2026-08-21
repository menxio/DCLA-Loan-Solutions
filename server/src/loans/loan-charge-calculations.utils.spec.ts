import {
  calculateChargeOutstanding,
  calculatePastDueInterest,
  calculatePenalty,
} from './loan-charge-calculations.utils';

describe('loan charge calculations', () => {
  it('calculates daily past due interest from a monthly rate', () => {
    expect(calculatePastDueInterest(10_000, 0.1, 3)).toBe(100);
  });

  it('calculates a one-time principal-based penalty', () => {
    expect(calculatePenalty(10_000, 0.3)).toBe(3_000);
  });

  it('subtracts paid and waived amounts from charge outstanding', () => {
    expect(
      calculateChargeOutstanding({
        accrued: 1_000,
        paid: 250,
        waived: 100,
      }),
    ).toBe(650);
  });

  it('never returns negative outstanding charges', () => {
    expect(
      calculateChargeOutstanding({
        accrued: 100,
        paid: 250,
        waived: 100,
      }),
    ).toBe(0);
  });
});

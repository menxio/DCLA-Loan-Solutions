export interface ChargeBucketInput {
  accrued?: number | string | null;
  paid?: number | string | null;
  waived?: number | string | null;
}

const toNumber = (value: unknown): number => {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const roundCurrency = (value: number): number =>
  Number(value.toFixed(2));

export const calculatePastDueInterest = (
  remainingBalance: number,
  monthlyRate: number,
  overdueDays: number,
): number =>
  roundCurrency(
    Math.max(0, remainingBalance) *
      Math.max(0, monthlyRate) *
      (Math.max(0, overdueDays) / 30),
  );

export const calculatePenalty = (
  principalAmount: number,
  penaltyRate: number,
): number =>
  roundCurrency(Math.max(0, principalAmount) * Math.max(0, penaltyRate));

export const calculateChargeOutstanding = (bucket: ChargeBucketInput): number =>
  roundCurrency(
    Math.max(
      0,
      toNumber(bucket.accrued) -
        toNumber(bucket.paid) -
        toNumber(bucket.waived),
    ),
  );

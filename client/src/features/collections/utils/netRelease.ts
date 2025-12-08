import type { MemberWithLoans } from "../types";

const MS_IN_DAY = 24 * 60 * 60 * 1000;
const NET_RELEASE_WINDOW_DAYS = 7;

const normalizeDate = (value?: string | Date | null): Date | null => {
  if (!value) return null;
  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : new Date(`${value}`.replace(/Z?$/, "Z"));
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  date.setHours(0, 0, 0, 0);
  return date;
};

export const computeNetReleaseForDate = (
  member: MemberWithLoans,
  referenceDate?: string | Date | null
): number => {
  const reference = normalizeDate(referenceDate);
  if (!reference) return 0;

  const loans = Array.isArray(member.loans) ? member.loans : [];

  return loans.reduce((sum, loan: any) => {
    const status = `${loan?.status || ""}`.toLowerCase();
    if (status !== "active") {
      return sum;
    }

    const releaseDate =
      normalizeDate(
        loan?.loanCreatedDate ?? loan?.createdAt ?? loan?.releaseDate ?? null
      ) ?? null;
    if (!releaseDate) {
      return sum;
    }

    if (reference.getTime() < releaseDate.getTime()) {
      return sum; // not yet released for this collection
    }

    const windowEnd = new Date(releaseDate.getTime());
    windowEnd.setDate(windowEnd.getDate() + (NET_RELEASE_WINDOW_DAYS - 1));
    if (reference.getTime() > windowEnd.getTime()) {
      return sum;
    }

    const netValue = Number(
      loan?.netCashReleased ?? (loan as any)?.net_release ?? 0
    );
    if (!Number.isFinite(netValue) || netValue <= 0) {
      return sum;
    }

    return sum + netValue;
  }, 0);
};

export const withNetReleaseForDate = <T extends MemberWithLoans>(
  member: T,
  referenceDate?: string | Date | null
): T & { netCashReleasedForDate: number; netCashReleased: number } => {
  const netCashReleasedForDate = computeNetReleaseForDate(
    member,
    referenceDate
  );
  return {
    ...member,
    netCashReleasedForDate,
    netCashReleased: netCashReleasedForDate,
  };
};

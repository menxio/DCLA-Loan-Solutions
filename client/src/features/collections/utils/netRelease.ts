import type { MemberWithLoans } from "../types";
import { businessDateToUtcDate } from "@utils/businessDate";

const NET_RELEASE_WINDOW_DAYS = 7;

type LoanLike = MemberWithLoans["loans"][number] & {
  status?: string;
  loanCreatedDate?: string | Date;
  createdAt?: string | Date;
  releaseDate?: string | Date;
  netCashReleased?: number | null;
  net_release?: number | null;
};

const normalizeDate = (value?: string | Date | null): Date | null => {
  if (!value) return null;
  const date = businessDateToUtcDate(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

export const computeNetReleaseForDate = (
  member: MemberWithLoans,
  referenceDate?: string | Date | null
): number => {
  const reference = normalizeDate(referenceDate);
  if (!reference) return 0;

  const loans = Array.isArray(member.loans) ? (member.loans as LoanLike[]) : [];

  return loans.reduce((sum, loan) => {
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
    windowEnd.setUTCDate(
      windowEnd.getUTCDate() + (NET_RELEASE_WINDOW_DAYS - 1)
    );
    if (reference.getTime() > windowEnd.getTime()) {
      return sum;
    }

    const netValue = Number(
      loan?.netCashReleased ?? loan?.net_release ?? 0
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

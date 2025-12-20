import type { Collection, MemberWithLoans } from "../types";

type StatusLabel = "PAID" | "PARTIAL" | "UNPAID";
type StatusColor = "success" | "warning" | "error";

export interface MemberStatusResult {
  label: StatusLabel;
  color: StatusColor;
  received: number;
  due: number;
  weeklyDue: number;
  weeksCovered: number;
  shortfall: number;
  totalPaid: number;
}

interface EvaluateOptions {
  collection?: Collection | null;
  referenceDate?: string | Date | null;
}

const EPSILON = 0.01;
const MS_IN_WEEK = 7 * 24 * 60 * 60 * 1000;

const normalizeReferenceDate = (reference?: string | Date | null): Date => {
  if (!reference) return new Date();
  if (reference instanceof Date) {
    return new Date(reference.getTime());
  }
  const fromString = new Date(reference);
  if (Number.isNaN(fromString.getTime())) {
    return new Date();
  }
  return fromString;
};

const computePaymentInfo = (
  member: MemberWithLoans,
  reference: Date
): {
  weeklyDue: number;
  shortfall: number;
  totalPaid: number;
  weeksCovered: number;
  expectedTotal: number;
} => {
  const loans = Array.isArray(member.loans) ? member.loans : [];
  const activeLoans = loans.filter(
    (loan: any) => (loan?.status || "").toLowerCase() === "active"
  );
  const relevantLoans =
    activeLoans.length > 0 ? activeLoans : loans.length > 0 ? [loans[0]] : [];

  const fallbackWeekly = relevantLoans.reduce(
    (sum, loan) => sum + Number((loan as any)?.weeklyPaymentAmount || 0),
    0
  );

  let expectedTotal = 0;
  let totalPaid = 0;

  relevantLoans.forEach((loan: any) => {
    const weekly = Number(loan?.weeklyPaymentAmount || 0);
    if (weekly <= 0) return;

    const amountPaid = Number(loan?.amountPaid || 0);
    totalPaid += amountPaid;

    const termWeeks = Number(loan?.termWeeks || 0);
    const startRaw =
      loan?.loanCreatedDate ?? loan?.createdAt ?? (loan as any)?.dueDate;
    if (!startRaw) return;

    const startDate = new Date(startRaw);
    const diffMs = reference.getTime() - startDate.getTime();
    if (diffMs < 0) return;

    const weeksElapsed = Math.floor(diffMs / MS_IN_WEEK) + 1;
    const cappedWeeks =
      termWeeks > 0 ? Math.min(weeksElapsed, termWeeks) : weeksElapsed;

    if (cappedWeeks > 0) {
      expectedTotal += cappedWeeks * weekly;
    }
  });

  const weeklyDue =
    Number(member.weeklyPaymentAmount || 0) || fallbackWeekly || 0;
  const shortfall = Math.max(
    0,
    Number((expectedTotal - totalPaid).toFixed(2))
  );
  const weeksCovered = weeklyDue > 0 ? Math.floor(totalPaid / weeklyDue) : 0;

  return {
    weeklyDue,
    shortfall,
    totalPaid,
    weeksCovered,
    expectedTotal,
  };
};

const deriveReceived = (collection?: Collection | null): number => {
  if (!collection) return 0;
  const value =
    (collection as any)?.amountReceived ??
    (collection as any)?.paymentReceived ??
    0;
  return Number(value) || 0;
};

const deriveDue = (
  collection: Collection | null | undefined,
  weeklyDue: number
): number => {
  const collectionAmount = Number(collection?.amount ?? 0);
  if (collectionAmount > EPSILON) {
    return collectionAmount;
  }
  return weeklyDue;
};

const mapLabelToColor = (label: StatusLabel): StatusColor => {
  if (label === "PAID") return "success";
  if (label === "PARTIAL") return "warning";
  return "error";
};

export const hasActiveLoan = (member: MemberWithLoans): boolean => {
  return (
    Array.isArray(member.loans) &&
    member.loans.some(
      (loan: any) => (loan?.status || "").toLowerCase() === "active"
    )
  );
};

export const hasLoanAmount = (member: MemberWithLoans): boolean => {
  const aggregateAmount = Number(
    member.totalLoanAmount ?? member.overallAmount ?? 0
  );
  if (aggregateAmount > EPSILON) {
    return true;
  }

  const loans = Array.isArray(member.loans) ? member.loans : [];
  return loans.some((loan: any) => {
    const principal = Number(
      (loan as any)?.principalAmount ?? (loan as any)?.amount ?? 0
    );
    return principal > EPSILON;
  });
};

export const evaluateMemberStatus = (
  member: MemberWithLoans,
  options: EvaluateOptions = {}
): MemberStatusResult => {
  const reference = normalizeReferenceDate(options.referenceDate);
  const paymentInfo = computePaymentInfo(member, reference);
  const hasActive = hasActiveLoan(member);
  const collection =
    options.collection ?? ((member as any).collection as Collection | undefined);
  const received = deriveReceived(collection);
  const due = deriveDue(collection, paymentInfo.weeklyDue);

  let label: StatusLabel = "UNPAID";

  // If we have an active loan but couldn't compute any expected due yet, default to UNPAID
  if (
    hasActive &&
    paymentInfo.weeklyDue > EPSILON &&
    paymentInfo.expectedTotal <= EPSILON &&
    paymentInfo.totalPaid <= EPSILON
  ) {
    label = received > EPSILON ? "PARTIAL" : "UNPAID";
  } else if (paymentInfo.weeklyDue <= EPSILON) {
    if (due > EPSILON) {
      if (received >= due - EPSILON) {
        label = "PAID";
      } else if (received > EPSILON) {
        label = "PARTIAL";
      } else {
        label = "UNPAID";
      }
    } else {
      label = "PAID";
    }
  } else if (paymentInfo.shortfall <= EPSILON) {
    // Treat "no expected due yet and no payments received" as unpaid
    if (paymentInfo.expectedTotal <= EPSILON && received <= EPSILON) {
      label = hasActive ? "UNPAID" : "PAID";
    } else if (due > EPSILON && received > EPSILON && received < due - EPSILON) {
      label = "PARTIAL";
    } else {
      label = "PAID";
    }
  } else if (paymentInfo.shortfall < paymentInfo.weeklyDue - EPSILON) {
    label = "PARTIAL";
  } else {
    label = "UNPAID";
  }

  return {
    label,
    color: mapLabelToColor(label),
    received,
    due,
    weeklyDue: paymentInfo.weeklyDue,
    weeksCovered: paymentInfo.weeksCovered,
    shortfall: paymentInfo.shortfall,
    totalPaid: paymentInfo.totalPaid,
  };
};

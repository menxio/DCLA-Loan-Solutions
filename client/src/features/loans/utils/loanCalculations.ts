import type { LoanCalculation } from "../types";

// Business logic for interest rates
export const getInterestRate = (termWeeks: number): number => {
  return termWeeks === 4 ? 0.10 : termWeeks === 8 ? 0.20 : 0.30;
};

// Savings is now manually provided at loan creation; keep function only if needed elsewhere
export const getSavingsRequired = (_principalAmount: number): number => {
  return 0;
};

// Calculate all loan details
export const calculateLoanDetails = (
  principalAmount: number,
  termWeeks: 4 | 8 | 12
): LoanCalculation => {
  const interestRate = getInterestRate(termWeeks);
  const totalInterest = principalAmount * interestRate;
  const totalAmount = principalAmount + totalInterest;
   // Compute base weekly payment
  const baseWeeklyPayment = totalAmount / termWeeks;
  // Round down to the nearest tens
  const roundedWeeklyPayment = Math.floor(baseWeeklyPayment / 10) * 10;
  // If term is 12 weeks, add 10 to the rounded weekly payment
  const weeklyPaymentAmount = termWeeks === 12 ? roundedWeeklyPayment + 10 : roundedWeeklyPayment;
  const savings = 0;

  return {
    principalAmount,
    termWeeks,
    interestRate,
    totalInterest,
    totalAmount,
    weeklyPaymentAmount,
    savings,
  };
};

// Format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
};

// Format percentage
export const formatPercentage = (value: number): string => {
  return `${(value * 100).toFixed(0)}%`;
}; 
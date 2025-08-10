import type { LoanCalculation } from "../types";

// Business logic for interest rates
export const getInterestRate = (termWeeks: number): number => {
  return termWeeks === 8 ? 0.20 : 0.30;
};

// Calculate savings required (10% of principal)
export const getSavingsRequired = (principalAmount: number): number => {
  return principalAmount * 0.10;
};

// Calculate all loan details
export const calculateLoanDetails = (
  principalAmount: number,
  termWeeks: 8 | 12
): LoanCalculation => {
  const interestRate = getInterestRate(termWeeks);
  const totalInterest = principalAmount * interestRate;
  const totalAmount = principalAmount + totalInterest;
  const weeklyPaymentAmount = totalAmount / termWeeks;
  const savingsRequired = getSavingsRequired(principalAmount);

  return {
    principalAmount,
    termWeeks,
    interestRate,
    totalInterest,
    totalAmount,
    weeklyPaymentAmount,
    savingsRequired,
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
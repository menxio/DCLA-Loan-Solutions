export const ROLE = {
  Admin: 'admin',
  Manager: 'manager',
  Cashier: 'cashier',
  LoanProcessor: 'loan processor',
} as const;

export type RoleName = (typeof ROLE)[keyof typeof ROLE];

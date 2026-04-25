import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { Loan } from '../loans/loan.entity';

function toNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function inferNetoffCarryOver(previousLoan: Loan | null | undefined): number {
  if (!previousLoan || previousLoan.status !== 'netoff') {
    return 0;
  }

  // In the reloan flow, the old loan balance is zeroed after netoff.
  // The best available historical approximation is the unpaid portion
  // from the prior loan's total amount at the time it was closed.
  const totalAmount = toNumber(previousLoan.totalAmount);
  const amountPaid = toNumber(previousLoan.amountPaid);
  return roundCurrency(Math.max(0, totalAmount - amountPaid));
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  await AppDataSource.initialize();

  const loanRepository = AppDataSource.getRepository(Loan);
  const loans = await loanRepository.find({
    relations: ['borrower'],
    order: {
      createdAt: 'ASC',
    },
  });

  const loansByBorrower = new Map<string, Loan[]>();
  for (const loan of loans) {
    const borrowerId = loan.borrower?.id;
    if (!borrowerId) {
      continue;
    }
    const history = loansByBorrower.get(borrowerId) ?? [];
    history.push(loan);
    loansByBorrower.set(borrowerId, history);
  }

  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  let totalLoansConsidered = 0;
  let netoffAdjusted = 0;

  for (const borrowerLoans of loansByBorrower.values()) {
    let previousLoan: Loan | null = null;

    for (const loan of borrowerLoans) {
      const shouldBackfill =
        loan.status === 'active' || loan.status === 'paid';
      if (!shouldBackfill) {
        previousLoan = loan;
        continue;
      }

      totalLoansConsidered += 1;

      if (loan.netCashReleased === null || loan.netCashReleased === undefined) {
        skipped += 1;
        previousLoan = loan;
        continue;
      }

      const principalAmount = toNumber(loan.principalAmount);
      const netCashReleased = toNumber(loan.netCashReleased);
      const savings = toNumber(loan.savings);
      const netoffCarryOver = inferNetoffCarryOver(previousLoan);

      // Business rule requested by the user:
      // service charge = principal - net cash released - savings
      // If the loan was created from a netoff reloan, also subtract the
      // previous loan's carried balance that reduced the cash released.
      const computedServiceCharge = roundCurrency(
        Math.max(0, principalAmount - netCashReleased - savings - netoffCarryOver),
      );
      const existingServiceCharge = roundCurrency(toNumber(loan.serviceCharge));

      if (existingServiceCharge === computedServiceCharge) {
        unchanged += 1;
        if (netoffCarryOver > 0) {
          netoffAdjusted += 1;
        }
        previousLoan = loan;
        continue;
      }

      if (!dryRun) {
        await loanRepository.update(loan.id, {
          serviceCharge: computedServiceCharge,
        });
      }

      updated += 1;
      if (netoffCarryOver > 0) {
        netoffAdjusted += 1;
      }
      previousLoan = loan;
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: dryRun ? 'dry-run' : 'write',
        totalLoansConsidered,
        updated,
        unchanged,
        skipped,
        netoffAdjusted,
      },
      null,
      2,
    ),
  );

  await AppDataSource.destroy();
}

main().catch(async (error) => {
  console.error('Loan service charge backfill failed.');
  console.error(error);

  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }

  process.exit(1);
});

import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { LoansService } from './loans.service';
import { LoanChargeSchedulerService } from './loan-charge-scheduler.service';

describe('LoanChargeSchedulerService', () => {
  const createService = (config: Record<string, string | undefined>) => {
    const loansService = {
      postOverdueChargesForActiveLoans: jest.fn(),
    };
    const configGet = jest.fn((key: string) => config[key]);
    const addCronJob = jest.fn<void, [string, CronJob]>();
    const service = new LoanChargeSchedulerService(
      loansService as unknown as LoansService,
      { get: configGet } as unknown as ConfigService,
      { addCronJob } as unknown as SchedulerRegistry,
    );

    return { service, addCronJob };
  };

  it('does not register automatic posting unless explicitly enabled', () => {
    const { service, addCronJob } = createService({});

    service.onModuleInit();

    expect(addCronJob).not.toHaveBeenCalled();
  });

  it('registers and starts the configured daily sweep', async () => {
    const { service, addCronJob } = createService({
      LOAN_CHARGE_SCHEDULER_ENABLED: 'true',
      LOAN_CHARGE_CRON: '0 0 * * *',
      APP_TIME_ZONE: 'Asia/Manila',
    });

    service.onModuleInit();

    expect(addCronJob).toHaveBeenCalledWith(
      'loan-charge-sweep',
      expect.any(CronJob),
    );
    const job = addCronJob.mock.calls[0][1];
    expect(job.isActive).toBe(true);
    await job.stop();
  });
});

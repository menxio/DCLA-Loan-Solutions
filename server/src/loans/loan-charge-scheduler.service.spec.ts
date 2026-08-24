import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { LoansService } from './loans.service';
import { LoanChargeSchedulerService } from './loan-charge-scheduler.service';
import { BusinessTimeService } from '../common/business-time/business-time.service';

describe('LoanChargeSchedulerService', () => {
  const createService = (config: Record<string, string | undefined>) => {
    const loansService = {
      postOverdueChargesForActiveLoans: jest.fn(),
    };
    const configGet = jest.fn((key: string) => config[key]);
    const addCronJob = jest.fn<void, [string, CronJob]>();
    const businessTime = {
      timeZone: 'Asia/Manila',
      currentBusinessDate: jest.fn(() => '2026-08-29'),
    };
    const service = new LoanChargeSchedulerService(
      loansService as unknown as LoansService,
      { get: configGet } as unknown as ConfigService,
      { addCronJob } as unknown as SchedulerRegistry,
      businessTime as unknown as BusinessTimeService,
    );

    return { service, addCronJob, loansService };
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

  it('passes the Manila business date to the charge sweep', async () => {
    const { service, loansService } = createService({});
    loansService.postOverdueChargesForActiveLoans.mockResolvedValue({
      asOfDate: '2026-08-29',
      scannedCount: 0,
      processedCount: 0,
      failedCount: 0,
      failures: [],
    });

    await service.postDueCharges();

    expect(loansService.postOverdueChargesForActiveLoans).toHaveBeenCalledWith(
      '2026-08-29',
    );
  });
});

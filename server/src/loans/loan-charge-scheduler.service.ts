import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { LoansService } from './loans.service';

@Injectable()
export class LoanChargeSchedulerService implements OnModuleInit {
  private readonly jobName = 'loan-charge-sweep';
  private readonly logger = new Logger(LoanChargeSchedulerService.name);
  private running = false;

  constructor(
    private readonly loansService: LoansService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    if (
      this.configService.get<string>('LOAN_CHARGE_SCHEDULER_ENABLED') !== 'true'
    ) {
      this.logger.log('Automatic loan charge sweep is disabled');
      return;
    }

    const cronTime =
      this.configService.get<string>('LOAN_CHARGE_CRON') ?? '0 0 * * *';
    const timeZone =
      this.configService.get<string>('APP_TIME_ZONE') ?? 'Asia/Manila';
    const job = CronJob.from({
      cronTime,
      onTick: () => this.postDueCharges(),
      start: false,
      timeZone,
      waitForCompletion: true,
    });

    this.schedulerRegistry.addCronJob(this.jobName, job);
    job.start();
    this.logger.log(
      `Automatic loan charge sweep enabled: cron=${cronTime}, timeZone=${timeZone}`,
    );
  }

  async postDueCharges(): Promise<void> {
    if (this.running) {
      this.logger.warn(
        'Skipping loan charge sweep because a previous run is still active',
      );
      return;
    }

    this.running = true;
    const asOfDate = this.getDateInTimeZone(
      new Date(),
      this.configService.get<string>('APP_TIME_ZONE') ?? 'Asia/Manila',
    );

    try {
      const result =
        await this.loansService.postOverdueChargesForActiveLoans(asOfDate);
      if (result.failedCount > 0) {
        this.logger.warn(
          `Loan charge sweep completed with failures: scanned=${result.scannedCount}, processed=${result.processedCount}, failed=${result.failedCount}, asOfDate=${result.asOfDate}`,
        );
        return;
      }

      this.logger.log(
        `Loan charge sweep completed: scanned=${result.scannedCount}, processed=${result.processedCount}, asOfDate=${result.asOfDate}`,
      );
    } catch (error) {
      this.logger.error(
        error instanceof Error ? error.message : 'Loan charge sweep failed',
      );
    } finally {
      this.running = false;
    }
  }

  private getDateInTimeZone(date: Date, timeZone: string): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const values = new Map(parts.map((part) => [part.type, part.value]));

    return `${values.get('year')}-${values.get('month')}-${values.get('day')}`;
  }
}

import { IsDateString, IsOptional } from 'class-validator';

export class PostLoanChargeSweepDto {
  @IsOptional()
  @IsDateString()
  asOfDate?: string;
}

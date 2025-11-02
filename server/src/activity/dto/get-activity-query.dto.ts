import { Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

const DEFAULT_LIMIT = 25;

export class GetActivityQueryDto {
  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @IsUUID()
  centerId?: string;

  @IsOptional()
  @IsUUID()
  loanId?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  dateFrom?: Date;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  dateTo?: Date;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10) || 1)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Math.min(parseInt(value, 10) || DEFAULT_LIMIT, 100))
  @IsNumber()
  limit?: number = DEFAULT_LIMIT;
}

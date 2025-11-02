import { IsOptional, IsString, IsUUID, IsNumber } from 'class-validator';

export class LogActivityDto {
  @IsString()
  entityType: string;

  @IsOptional()
  @IsString()
  entityId?: string | null;

  @IsOptional()
  @IsUUID()
  memberId?: string | null;

  @IsOptional()
  @IsUUID()
  centerId?: string | null;

  @IsOptional()
  @IsUUID()
  loanId?: string | null;

  @IsString()
  action: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsNumber()
  amount?: number | null;

  @IsOptional()
  payload?: Record<string, any> | null;

  @IsOptional()
  @IsUUID()
  performedByUserId?: string | null;
}

import { IsNumber, IsOptional, IsUUID, IsIn, Min } from 'class-validator';

export class CreateLoanDto {
  @IsUUID()
  borrowerId: string;

  @IsNumber()
  principalAmount: number;

  @IsIn([4, 8, 12])
  termWeeks: number;

  // Manual savings amount; required only for a member's first loan (validated in service)
  @IsOptional()
  @IsNumber()
  @Min(0)
  savings?: number;
} 
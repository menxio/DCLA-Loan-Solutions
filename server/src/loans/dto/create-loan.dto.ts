import { IsString, IsNumber, IsOptional, IsUUID, IsIn } from 'class-validator';

export class CreateLoanDto {
  @IsUUID()
  borrowerId: string;

  @IsNumber()
  principalAmount: number;

  @IsIn([8, 12])
  termWeeks: number;
} 
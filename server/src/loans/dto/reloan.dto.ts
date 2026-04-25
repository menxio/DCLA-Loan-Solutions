import { IsIn, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class ReloanDto {
  @IsNumber()
  @Min(1)
  newPrincipalAmount: number;

  @IsInt()
  @IsIn([4, 8, 12])
  newTermWeeks: 4 | 8 | 12;

  @IsIn(['payoff', 'netoff'])
  mode: 'payoff' | 'netoff';

  @IsNumber()
  @IsOptional()
  @Min(0)
  serviceCharge?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  notarialFee?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  savings?: number;
}

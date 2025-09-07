import { IsIn, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class ReloanDto {
  @IsNumber()
  @Min(1)
  newPrincipalAmount: number;

  @IsInt()
  @IsIn([8, 12] as any)
  newTermWeeks: 8 | 12;

  @IsIn(['payoff', 'netoff'] as any)
  mode: 'payoff' | 'netoff';

  @IsNumber()
  @IsOptional()
  @Min(0)
  serviceCharge?: number; // Flat fee, default 500 if omitted
}



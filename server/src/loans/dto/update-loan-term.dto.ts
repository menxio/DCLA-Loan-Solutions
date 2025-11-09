import { IsIn, IsNumber } from 'class-validator';

export class UpdateLoanTermDto {
  @IsNumber()
  @IsIn([4, 8, 12], {
    message: 'termWeeks must be one of 4, 8, or 12 weeks',
  })
  termWeeks: number;
}

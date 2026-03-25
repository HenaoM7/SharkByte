import { IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePlanDto {
  @ApiProperty({ enum: ['free', 'pro', 'enterprise', 'enterprise_annual'] })
  @IsString()
  @IsIn(['free', 'pro', 'enterprise', 'enterprise_annual'], {
    message: 'planName debe ser: free, pro, enterprise o enterprise_annual',
  })
  planName: string;
}

import { IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePlanDto {
  @ApiProperty({ enum: ['free', 'pro', 'enterprise'] })
  @IsString()
  @IsIn(['free', 'pro', 'enterprise'], {
    message: 'planName debe ser: free, pro o enterprise',
  })
  planName: string;
}

import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TenantStatus } from '../tenants.schema';

export class UpdateStatusDto {
  @ApiProperty({ enum: ['active', 'inactive', 'suspended', 'trial', 'cancelled'] })
  @IsEnum(['active', 'inactive', 'suspended', 'trial', 'cancelled'] as const, {
    message: 'status debe ser: active, inactive, suspended, trial o cancelled',
  })
  status: TenantStatus;
}

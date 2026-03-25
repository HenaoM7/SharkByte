import { IsString, IsNotEmpty, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckoutDto {
  @ApiProperty({ description: 'ID del tenant' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ description: 'Nombre del plan: pro o enterprise', enum: ['pro', 'enterprise'] })
  @IsString()
  @IsIn(['pro', 'enterprise'])
  planName: string;
}

import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Reutilizado para cancel, pause y resume — todos solo necesitan tenantId
export class TenantActionDto {
  @ApiProperty({ description: 'ID del tenant' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;
}

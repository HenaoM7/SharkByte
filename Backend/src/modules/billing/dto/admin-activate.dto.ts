import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class AdminActivateDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsIn(['pro', 'enterprise'])
  planName: string;
}

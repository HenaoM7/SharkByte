import { IsEmail, IsString, MinLength, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'usuario@empresa.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ enum: ['admin', 'owner', 'viewer'], default: 'owner' })
  @IsOptional()
  @IsIn(['admin', 'owner', 'viewer'])
  role?: 'admin' | 'owner' | 'viewer';

  @ApiPropertyOptional({ example: 'tenant_573001112233' })
  @IsOptional()
  @IsString()
  tenantId?: string;
}

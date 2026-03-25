import { IsOptional, IsIn, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryTenantsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['active', 'inactive', 'suspended', 'trial'] })
  @IsOptional()
  @IsIn(['active', 'inactive', 'suspended', 'trial'])
  status?: string;

  @ApiPropertyOptional({ enum: ['free', 'pro', 'enterprise'] })
  @IsOptional()
  @IsIn(['free', 'pro', 'enterprise'])
  plan?: string;

  @ApiPropertyOptional({ enum: ['createdAt', 'name', 'messagesUsed'], default: 'createdAt' })
  @IsOptional()
  @IsIn(['createdAt', 'name', 'messagesUsed'])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

import { IsString, IsOptional, IsNumber, IsIn, MaxLength, Min } from 'class-validator';

export class CreateDealDto {
  @IsString() tenantId: string;
  @IsString() pipelineId: string;
  @IsString() stageId: string;
  @IsString() @MaxLength(200) title: string;
  @IsOptional() @IsString() @MaxLength(30) contactPhone?: string;
  @IsOptional() @IsString() @MaxLength(100) contactName?: string;
  @IsOptional() @IsNumber() @Min(0) value?: number;
  @IsOptional() @IsString() @MaxLength(100) assignedTo?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class UpdateDealDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() stageId?: string;
  @IsOptional() @IsString() @MaxLength(30) contactPhone?: string;
  @IsOptional() @IsString() @MaxLength(100) contactName?: string;
  @IsOptional() @IsNumber() @Min(0) value?: number;
  @IsOptional() @IsIn(['open', 'won', 'lost']) status?: string;
  @IsOptional() @IsString() @MaxLength(100) assignedTo?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class MoveDealDto {
  @IsString() stageId: string;
}

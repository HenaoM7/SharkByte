import { IsString, IsOptional, IsArray, IsIn, MaxLength } from 'class-validator';

export class UpdateContactDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(200) email?: string;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsIn(['whatsapp', 'manual', 'import']) source?: string;
  @IsOptional() @IsString() @MaxLength(100) assignedTo?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

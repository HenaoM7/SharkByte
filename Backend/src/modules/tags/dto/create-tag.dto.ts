import { IsString, IsOptional, MaxLength, Matches } from 'class-validator';

export class CreateTagDto {
  @IsString() tenantId: string;
  @IsString() @MaxLength(50) name: string;
  @IsOptional() @IsString() @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'color debe ser hex (#rrggbb)' }) color?: string;
}

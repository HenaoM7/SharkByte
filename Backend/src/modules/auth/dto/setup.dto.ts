import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetupDto {
  @ApiProperty({ example: 'admin@sharkbyte.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password_seguro_123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}

import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token recibido en el email de recuperacion' })
  @IsString()
  @MaxLength(128)
  token: string;

  @ApiProperty({ example: 'MiPass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'La contrasena debe tener al menos una letra y un numero',
  })
  newPassword: string;
}

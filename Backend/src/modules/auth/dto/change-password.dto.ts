import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Contrasena actual' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'MiPass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'La contrasena debe tener al menos una letra y un numero',
  })
  newPassword: string;
}

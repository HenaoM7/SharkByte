import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User, UserSchema } from '../users/users.schema';
import { PasswordReset, PasswordResetSchema } from './schemas/password-reset.schema';
import { TenantsModule } from '../tenants/tenants.module';
import { TenantConfigModule } from '../tenant-config/tenant-config.module';
import { OwnershipGuard } from './guards/ownership.guard';

@Module({
  imports: [
    PassportModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: PasswordReset.name, schema: PasswordResetSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') || '15m' },
      }),
    }),
    TenantsModule,
    TenantConfigModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, OwnershipGuard],
  exports: [AuthService, JwtModule, OwnershipGuard],
})
export class AuthModule {}

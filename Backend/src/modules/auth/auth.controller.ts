import {
  Controller, Post, Body, Get, UseGuards, Req, Res,
  HttpCode, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Request, Response } from 'express';
import { parse as parseCookies } from 'cookie';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SetupDto } from './dto/setup.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from '../users/users.schema';

const IS_PROD = process.env.NODE_ENV === 'production';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  /** Opciones base para cookies httpOnly. En producción: Secure + SameSite=Strict + dominio raíz */
  private cookieBase() {
    return {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: (IS_PROD ? 'strict' : 'lax') as 'strict' | 'lax',
      path: '/',
      ...(IS_PROD ? { domain: '.sharkbyteia.com' } : {}),
    };
  }

  /** Escribe access_token (15 min) y refresh_token (7 d) como cookies httpOnly */
  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const base = this.cookieBase();
    res.cookie('access_token', accessToken, { ...base, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { ...base, maxAge: 7 * 24 * 60 * 60 * 1000 });
  }

  @Post('setup')
  @HttpCode(201)
  @Throttle({ strict: { limit: 3, ttl: 3600_000 } })
  @ApiOperation({ summary: 'Configuración inicial — crear primer super_admin' })
  async setup(@Body() dto: SetupDto) {
    const adminExists = await this.userModel.findOne({ role: 'super_admin' });
    if (adminExists) throw new ForbiddenException('Setup ya completado.');
    return this.authService.createUser(dto.email, dto.password, 'system', 'super_admin');
  }

  @Post('register')
  @HttpCode(201)
  @Throttle({ strict: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Registro público — crea negocio + usuario owner + auto-login' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.register(dto);
    this.setAuthCookies(res, data.accessToken, data.refreshToken);
    return { user: data.user, tenant: data.tenant };
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Iniciar sesión — establece cookies httpOnly' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.login(dto);
    this.setAuthCookies(res, data.accessToken, data.refreshToken);
    return { user: data.user };
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Renovar tokens usando la cookie refresh_token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Leer refresh_token de cookie httpOnly
    const cookies = parseCookies(req.headers.cookie || '');
    const refreshToken = cookies.refresh_token ?? '';
    const data = await this.authService.refreshFromToken(refreshToken);
    this.setAuthCookies(res, data.accessToken, data.refreshToken);
    return { user: data.user };
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cerrar sesión — elimina cookies de autenticación' })
  logout(@Res({ passthrough: true }) res: Response) {
    const base = this.cookieBase();
    res.clearCookie('access_token', base);
    res.clearCookie('refresh_token', base);
    return { ok: true };
  }

  @Post('forgot-password')
  @HttpCode(200)
  @Throttle({ strict: { limit: 3, ttl: 300_000 } })
  @ApiOperation({ summary: 'Solicitar recuperación de contraseña — envía email con token' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(200)
  @Throttle({ strict: { limit: 5, ttl: 300_000 } })
  @ApiOperation({ summary: 'Restablecer contraseña con token del email' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Cambiar contraseña (usuario autenticado)' })
  changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.userId, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @SkipThrottle()
  @ApiOperation({ summary: 'Datos del usuario autenticado' })
  me(@Req() req: any) {
    return req.user;
  }
}

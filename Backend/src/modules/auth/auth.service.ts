import {
  Injectable, UnauthorizedException, ConflictException,
  NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { User } from '../users/users.schema';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { TenantsService } from '../tenants/tenants.service';
import { TenantConfigService } from '../tenant-config/tenant-config.service';
import { PasswordReset } from './schemas/password-reset.schema';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(PasswordReset.name) private resetModel: Model<PasswordReset>,
    private jwtService: JwtService,
    private config: ConfigService,
    private tenantsService: TenantsService,
    private tenantConfigService: TenantConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (!user) throw new UnauthorizedException('Credenciales incorrectas');

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Credenciales incorrectas');

    if (!user.isActive) throw new UnauthorizedException('Usuario inactivo');

    return this.generateTokens(user);
  }

  // Verifica el refresh token (firmado con JWT_REFRESH_SECRET) y emite nuevos tokens
  async refreshFromToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
      const user = await this.userModel.findById(payload.sub);
      if (!user || !user.isActive) throw new Error('inactive');
      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  private generateTokens(user: User) {
    const payload: JwtPayload = {
      sub: (user._id as any).toString(),
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN') || '15m',
    });

    const refreshToken = this.jwtService.sign(
      { sub: payload.sub },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d',
      },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        tenantId: payload.tenantId,
      },
    };
  }

  // Registro público SaaS: crea Tenant + User (owner) + retorna tokens (auto-login)
  async register(dto: RegisterDto) {
    // 1. Verificar email único
    const emailExists = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (emailExists) throw new ConflictException('El email ya está registrado');

    // 2. Crear el tenant (TenantsService valida teléfono único y auto-genera tenantId)
    const tenant = await this.tenantsService.create({
      name: dto.businessName,
      phone: dto.phone,
      email: dto.email,
      planName: 'free',
    });

    // 3. Crear el usuario owner vinculado al tenant
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.userModel.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      role: 'owner',
      tenantId: tenant.tenantId,
      isActive: true,
    });

    // 4. Vincular el userId del owner al tenant (para filtrado multi-tenant)
    await this.tenantsService.setOwner(tenant.tenantId, (user._id as any).toString());

    // 5. Pre-popular la configuración del negocio con datos del registro
    try {
      const countryMap: Record<string, string> = {
        CO: 'Colombia', MX: 'México', AR: 'Argentina', PE: 'Perú',
        CL: 'Chile', EC: 'Ecuador', VE: 'Venezuela', US: 'Estados Unidos', ES: 'España',
      };
      await this.tenantConfigService.upsert(tenant.tenantId, {
        businessName: dto.businessName,
        ...(dto.businessType    && { businessType: dto.businessType }),
        ...(dto.businessTypeCustom && { businessTypeCustom: dto.businessTypeCustom }),
        ...(dto.country         && { country: countryMap[dto.country] ?? dto.country }),
        ...(dto.agentName       && { agentName: dto.agentName }),
        ...(dto.currency        && { currency: dto.currency }),
        ...(dto.teamSize        && { teamSize: dto.teamSize }),
        ...(dto.language        && { language: dto.language }),
        ...(dto.paymentMethods  && { paymentMethods: dto.paymentMethods }),
        ...(dto.address         && { businessAddress: { street: dto.address, city: dto.city ?? '', state: '', reference: '', postalCode: '' } }),
        ...(dto.timezone        && { businessHours: { timezone: dto.timezone, schedule: [] } }),
        automations: {
          sales:        dto.salesAutomation   ?? false,
          support:      dto.autoReply         ?? false,
          reservations: dto.agendaAutomation  ?? false,
          payments:     false,
          alerts:       dto.followUpAutomation ?? false,
        },
      });
    } catch (err) {
      // No bloquear el registro si falla la config inicial
      this.logger.warn(`No se pudo crear config inicial para ${tenant.tenantId}: ${err?.message}`);
    }

    // 6. Devolver tokens + datos básicos (auto-login)
    const tokens = this.generateTokens(user);
    return {
      ...tokens,
      tenant: {
        tenantId: tenant.tenantId,
        name: tenant.name,
      },
    };
  }

  async createUser(email: string, password: string, tenantId: string, role = 'owner') {
    const exists = await this.userModel.findOne({ email: email.toLowerCase() });
    if (exists) throw new ConflictException('El email ya está registrado');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.userModel.create({
      email: email.toLowerCase(),
      passwordHash,
      role,
      tenantId,
      isActive: true,
    });

    return { id: (user._id as any), email: user.email, role: user.role, tenantId: user.tenantId };
  }

  // ──────────────────────────────────────────────
  //  FORGOT PASSWORD — genera token y envía email
  // ──────────────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const email = dto.email.toLowerCase();
    const user = await this.userModel.findOne({ email });

    // Respuesta siempre igual — no revelar si el email existe
    const genericMsg = 'Si el email está registrado, recibirás un enlace de recuperación en breve.';
    if (!user || !user.isActive) {
      // Retardo constante para evitar timing attacks (enumeración de emails)
      await new Promise((r) => setTimeout(r, 300 + Math.floor(Math.random() * 200)));
      return { message: genericMsg };
    }

    // Invalidar tokens anteriores para este email
    await this.resetModel.deleteMany({ email });

    // Generar token seguro
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await this.resetModel.create({ email, token: tokenHash, expiresAt, used: false });

    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    // Enviar email si está configurado el SMTP, sino loguear para dev
    await this.sendResetEmail(email, resetUrl);

    return { message: genericMsg };
  }

  private async sendResetEmail(email: string, resetUrl: string) {
    const smtpHost = this.config.get<string>('SMTP_HOST');

    if (!smtpHost) {
      // Modo desarrollo — imprimir link en consola
      this.logger.warn(`[DEV] Reset password para ${email}: ${resetUrl}`);
      return;
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: this.config.get<number>('SMTP_PORT') || 587,
        secure: false,
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
      });

      await transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM') || 'noreply@sharkbyte.com',
        to: email,
        subject: 'Recuperación de contraseña — SharkByte',
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px">
            <h2 style="color:#153959">SharkByte</h2>
            <p>Recibimos una solicitud para restablecer tu contraseña.</p>
            <p>Haz clic en el siguiente enlace (válido por 1 hora):</p>
            <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#153959;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
              Restablecer contraseña
            </a>
            <p style="color:#888;font-size:13px;margin-top:24px">
              Si no solicitaste esto, ignora este email.<br/>
              Este enlace expira en 1 hora.
            </p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error(`Error enviando email de reset a ${email}: ${err.message}`);
    }
  }

  // ──────────────────────────────────────────────
  //  RESET PASSWORD — valida token y actualiza pass
  // ──────────────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');

    const resetDoc = await this.resetModel.findOne({
      token: tokenHash,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetDoc) {
      throw new BadRequestException('Token inválido o expirado. Solicita uno nuevo.');
    }

    const user = await this.userModel.findOne({ email: resetDoc.email });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.userModel.updateOne({ _id: user._id }, { passwordHash });

    // Marcar token como usado
    await this.resetModel.updateOne({ _id: resetDoc._id }, { used: true });

    return { message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' };
  }

  // ──────────────────────────────────────────────
  //  CHANGE PASSWORD — usuario autenticado cambia pass
  // ──────────────────────────────────────────────
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('La contraseña actual es incorrecta.');

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('La nueva contraseña debe ser diferente a la actual.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.userModel.updateOne({ _id: userId }, { passwordHash });

    return { message: 'Contraseña actualizada correctamente.' };
  }
}

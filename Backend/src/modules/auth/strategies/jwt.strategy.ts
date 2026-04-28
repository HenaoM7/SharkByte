import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { PassportStrategy } from '@nestjs/passport';
import { Model, Types } from 'mongoose';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { parse as parseCookies } from 'cookie';
import { User } from '../../users/users.schema';

export interface JwtPayload {
  sub: string;       // userId
  email: string;
  role: string;
  tenantId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 1. httpOnly cookie (método preferido — seguro contra XSS)
        (req: any) => {
          if (!req?.headers?.cookie) return null;
          const cookies = parseCookies(req.headers.cookie as string);
          return cookies.access_token ?? null;
        },
        // 2. Bearer header (fallback — compatibilidad Swagger / scripts)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (!Types.ObjectId.isValid(payload.sub)) {
      throw new UnauthorizedException('Token inválido');
    }
    const user = await this.userModel.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Token inválido o usuario inactivo');
    }
    return { userId: payload.sub, email: payload.email, role: payload.role, tenantId: payload.tenantId };
  }
}

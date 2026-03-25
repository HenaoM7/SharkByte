import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Guard para endpoints internos que llama n8n
// No usa JWT, usa una clave estática en header x-internal-key
@Injectable()
export class InternalKeyGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = request.headers['x-internal-key'];
    const expected = this.config.get<string>('INTERNAL_API_KEY');

    if (!key || key !== expected) {
      throw new UnauthorizedException('Clave interna inválida');
    }
    return true;
  }
}

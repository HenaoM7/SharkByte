import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { UsageService } from '../../usage/usage.service';

// Guard que bloquea POST /internal/usage/record si el tenant superó su límite de plan
// Retorna 429 Too Many Requests para que n8n maneje el caso sin contar el mensaje
@Injectable()
export class UsageLimitGuard implements CanActivate {
  constructor(private usageService: UsageService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.body?.tenantId;

    if (!tenantId) return true; // sin tenantId no podemos verificar — el controller lo manejará

    const result = await this.usageService.canProcessDetailed(tenantId);

    if (!result.ok) {
      const messages: Record<string, string> = {
        tenant_not_found: 'Tenant no encontrado.',
        tenant_inactive: 'El tenant está inactivo y no puede procesar mensajes.',
        no_evolution_credentials: 'El tenant no tiene credenciales de Evolution API configuradas.',
        messages_limit_reached: 'Límite de mensajes del plan alcanzado para este mes.',
        tokens_limit_reached: 'Límite de tokens del plan alcanzado para este mes.',
      };
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: messages[result.reason] ?? 'El tenant no puede procesar más mensajes.',
          reason: result.reason,
          tenantId,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}

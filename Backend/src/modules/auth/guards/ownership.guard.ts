import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantsService } from '../../tenants/tenants.service';

/**
 * Guard de Ownership Multi-tenant.
 *
 * Reglas:
 * - super_admin y admin pueden acceder a cualquier tenant
 * - owner: puede acceder a su tenant primario (user.tenantId) y a cualquier
 *   tenant cuyo userId coincida con su user.userId (multi-tenant owners)
 * - viewer: solo puede acceder a su tenant primario
 *
 * Uso: @UseGuards(JwtAuthGuard, OwnershipGuard)
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private tenantsService: TenantsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return false;

    // Super admin y admin tienen acceso total
    if (user.role === 'super_admin' || user.role === 'admin') {
      return true;
    }

    const tenantIdParam = request.params?.tenantId;
    if (!tenantIdParam) return true; // Ruta sin :tenantId, no aplica

    // Tenant primario del usuario — acceso inmediato
    if (user.tenantId === tenantIdParam) {
      return true;
    }

    // Owner con múltiples tenants: verificar en DB que tenant.userId === user.userId
    if (user.role === 'owner' && user.userId) {
      try {
        const tenant = await this.tenantsService.findById(tenantIdParam);
        if (tenant && tenant.userId === user.userId) {
          return true;
        }
      } catch {
        // Tenant no encontrado → denegar
      }
    }

    throw new ForbiddenException('No tienes acceso a este tenant.');
  }
}

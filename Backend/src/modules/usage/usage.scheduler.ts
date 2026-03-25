import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ModuleRef } from '@nestjs/core';
import { UsageService } from './usage.service';

@Injectable()
export class UsageScheduler {
  constructor(
    private usageService: UsageService,
    private moduleRef: ModuleRef,
  ) {}

  // Ejecuta el día 1 de cada mes a medianoche
  // 1. Captura snapshot histórico (Analytics) antes de resetear
  // 2. Reinicia messagesUsed y tokensUsed de TODOS los tenants
  @Cron('0 0 1 * *')
  async handleMonthlyReset() {
    // Capturar snapshot ANTES del reset para Analytics histórico
    try {
      const { AnalyticsService } = await import('../analytics/analytics.service');
      const analyticsService = this.moduleRef.get(AnalyticsService, { strict: false });
      if (analyticsService) {
        await analyticsService.captureSnapshot();
      }
    } catch {
      // AnalyticsModule puede no estar disponible en todos los entornos
    }

    await this.usageService.resetAllMonthly();
  }
}

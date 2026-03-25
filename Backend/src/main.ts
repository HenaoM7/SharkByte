import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers (Helmet)
  app.use(helmet());

  // Validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global Exception Filter — respuestas de error consistentes, sin stack traces
  app.useGlobalFilters(new AllExceptionsFilter());

  // Interceptors globales
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TimeoutInterceptor(),
  );

  // CORS — en producción sólo se permite el origen del frontend configurado
  const allowedOrigin = process.env.NODE_ENV === 'production'
    ? (process.env.FRONTEND_URL || 'https://sharkbyteia.com')
    : true;
  app.enableCors({ origin: allowedOrigin, credentials: true });

  // Swagger — solo en desarrollo
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('SharkByte API')
      .setDescription('Backend API para la plataforma SaaS SharkByte')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Auth', 'Autenticación y registro')
      .addTag('Tenants', 'Gestión de tenants')
      .addTag('Users', 'Gestión de usuarios')
      .addTag('Plans', 'Planes de suscripción')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
  }

  // Health check básico
  const app2 = app.getHttpAdapter();
  app2.get('/health', (_req: any, res: any) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`SharkByte Backend corriendo en: http://localhost:${port}`);
  if (process.env.NODE_ENV !== 'production') {
    logger.log(`Swagger docs: http://localhost:${port}/api-docs`);
  }
}

bootstrap();

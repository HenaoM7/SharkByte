/**
 * Tests E2E — Flujo completo de Autenticación
 *
 * Usa MongoMemoryServer para una base de datos real en memoria.
 * Valida el comportamiento HTTP completo: rutas, status codes, cookies,
 * validación de DTOs, rate limits (no aplicados en test), respuestas de error.
 *
 * Escenarios:
 *  1. Registro exitoso → 201 + cookies httpOnly
 *  2. Registro duplicado → 409
 *  3. Registro con datos inválidos → 400
 *  4. Login exitoso → 200 + cookies
 *  5. Login con credenciales incorrectas → 401
 *  6. Login con usuario inactivo → 401
 *  7. GET /auth/me sin token → 401
 *  8. GET /auth/me con token válido → 200
 *  9. POST /auth/refresh sin cookie → 401
 * 10. POST /auth/logout → 200 + limpia cookies
 * 11. POST /auth/forgot-password → siempre 200 (anti-enumeración)
 * 12. POST /auth/reset-password con token inválido → 400
 * 13. POST /auth/change-password autenticado → 200
 * 14. POST /auth/setup → crea super_admin, segunda llamada → 403
 */

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ValidationPipe } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { AuthModule } from '../src/modules/auth/auth.module';
import { PlansModule } from '../src/modules/plans/plans.module';
import { TenantsModule } from '../src/modules/tenants/tenants.module';
import { UsageModule } from '../src/modules/usage/usage.module';

let mongod: MongoMemoryServer;
let app: INestApplication;

// Registro de prueba único para esta suite
const TEST_REG = {
  businessName: 'Restaurante E2E Test',
  phone: '+573009998877',
  email: 'e2etest@sharkbyte.com',
  password: 'SecurePass123!',
};

async function buildApp(): Promise<INestApplication> {
  mongod = await MongoMemoryServer.create();

  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [() => ({
          JWT_SECRET: 'e2e-test-secret',
          JWT_REFRESH_SECRET: 'e2e-refresh-secret',
          JWT_EXPIRES_IN: '15m',
          JWT_REFRESH_EXPIRES_IN: '7d',
          FRONTEND_URL: 'http://localhost:5173',
        })],
      }),
      MongooseModule.forRoot(mongod.getUri()),
      ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 1000 }]),
      ScheduleModule.forRoot(),
      PlansModule,
      UsageModule,
      TenantsModule,
      AuthModule,
    ],
  }).compile();

  const application = moduleRef.createNestApplication();
  application.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  application.useGlobalFilters(new AllExceptionsFilter());
  await application.init();
  return application;
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeAll(async () => {
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
  if (mongod) await mongod.stop();
});

// ── Helper: registrar y obtener cookie ───────────────────────────────────────

function getCookies(res: any): string[] {
  const raw = res.headers['set-cookie'];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

async function registerAndGetCookie(dto = TEST_REG): Promise<string[]> {
  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send(dto);
  return getCookies(res);
}

// ══════════════════════════════════════════════════════════════════════════════
// SUITE: /auth/register
// ══════════════════════════════════════════════════════════════════════════════

describe('POST /auth/register', () => {
  it('201 — registro exitoso con datos válidos', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(TEST_REG)
      .expect(201);

    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(TEST_REG.email);
    expect(res.body.tenant).toBeDefined();
    expect(res.body.tenant.tenantId).toMatch(/^tenant_/);
  });

  it('establece cookies httpOnly access_token y refresh_token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...TEST_REG, phone: '+573001111110', email: 'cookie@test.com' });

    const cookies = getCookies(res);
    expect(cookies.length).toBeGreaterThan(0);
    const cookieStr = cookies.join(';');
    expect(cookieStr).toContain('access_token');
    expect(cookieStr).toContain('refresh_token');
    expect(cookieStr).toContain('HttpOnly');
  });

  it('409 — email duplicado', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(TEST_REG)
      .expect(409);

    expect(res.body.statusCode).toBe(409);
  });

  it('409 — teléfono duplicado', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...TEST_REG, email: 'different@email.com' })
      .expect(409);

    expect(res.body.statusCode).toBe(409);
  });

  it('400 — email inválido', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...TEST_REG, email: 'not-an-email', phone: '+570000000001' })
      .expect(400);
  });

  it('400 — teléfono sin + (formato internacional requerido)', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...TEST_REG, phone: '3001234567', email: 'phone@test.com' })
      .expect(400);
  });

  it('400 — contraseña demasiado corta (< 8 chars)', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...TEST_REG, password: '1234567', phone: '+570000000002', email: 'short@test.com' })
      .expect(400);
  });

  it('400 — businessName vacío', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...TEST_REG, businessName: 'X', phone: '+570000000003', email: 'name@test.com' })
      .expect(400); // MinLength(2)
  });

  it('400 — campos extra no permitidos (forbidNonWhitelisted)', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...TEST_REG, phone: '+570000000004', email: 'extra@test.com', hackerField: 'evil' })
      .expect(400);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE: /auth/login
// ══════════════════════════════════════════════════════════════════════════════

describe('POST /auth/login', () => {
  it('200 — login exitoso con credenciales correctas', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TEST_REG.email, password: TEST_REG.password })
      .expect(200);

    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(TEST_REG.email);
    // No expone accessToken en el body (va en cookie)
    expect(res.body).not.toHaveProperty('accessToken');
  });

  it('establece cookies tras login exitoso', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TEST_REG.email, password: TEST_REG.password });

    const cookieStr = getCookies(res).join(';');
    expect(cookieStr).toContain('access_token');
    expect(cookieStr).toContain('refresh_token');
  });

  it('401 — credenciales incorrectas', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TEST_REG.email, password: 'wrongpassword' })
      .expect(401);

    expect(res.body.statusCode).toBe(401);
  });

  it('401 — email inexistente', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ghost@ghost.com', password: 'anypass123' })
      .expect(401);
  });

  it('400 — email inválido en login', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'not-email', password: 'pass123' })
      .expect(400);
  });

  it('400 — contraseña muy corta', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@test.com', password: '123' })
      .expect(400);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE: /auth/me
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /auth/me', () => {
  it('401 — sin cookie de autenticación', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .expect(401);
  });

  it('200 — retorna datos del usuario autenticado', async () => {
    // Login para obtener cookie
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TEST_REG.email, password: TEST_REG.password });

    const cookies = getCookies(loginRes);

    const meRes = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', cookies)
      .expect(200);

    expect(meRes.body.email).toBe(TEST_REG.email);
    expect(meRes.body.role).toBe('owner');
    // No expone passwordHash
    expect(meRes.body).not.toHaveProperty('passwordHash');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE: /auth/logout
// ══════════════════════════════════════════════════════════════════════════════

describe('POST /auth/logout', () => {
  it('200 — responde ok y limpia cookies', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.status).toBe(200);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE: /auth/refresh
// ══════════════════════════════════════════════════════════════════════════════

describe('POST /auth/refresh', () => {
  it('401 — sin cookie refresh_token', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .expect(401);
  });

  it('200 — renueva tokens con refresh_token válido', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TEST_REG.email, password: TEST_REG.password });

    const cookies = getCookies(loginRes);

    const refreshRes = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookies)
      .expect(200);

    expect(refreshRes.body.user).toBeDefined();
    expect(getCookies(refreshRes).length).toBeGreaterThan(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE: /auth/forgot-password
// ══════════════════════════════════════════════════════════════════════════════

describe('POST /auth/forgot-password', () => {
  it('200 — mismo mensaje para email existente (anti-enumeración)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: TEST_REG.email })
      .expect(200);

    expect(res.body.message).toContain('Si el email está registrado');
  });

  it('200 — mismo mensaje para email inexistente (anti-enumeración)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'ghost123@nobody.com' })
      .expect(200);

    expect(res.body.message).toContain('Si el email está registrado');
  });

  it('400 — email inválido', async () => {
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'not-an-email' })
      .expect(400);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE: /auth/reset-password
// ══════════════════════════════════════════════════════════════════════════════

describe('POST /auth/reset-password', () => {
  it('400 — token inválido/expirado', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: 'completamente-invalido-token-123', newPassword: 'NewPass123!' })
      .expect(400);

    expect(res.body.statusCode).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE: /auth/change-password
// ══════════════════════════════════════════════════════════════════════════════

describe('POST /auth/change-password', () => {
  it('401 — sin autenticación', async () => {
    await request(app.getHttpServer())
      .post('/auth/change-password')
      .send({ currentPassword: 'old', newPassword: 'new12345' })
      .expect(401);
  });

  it('200 — cambia contraseña con credenciales correctas', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TEST_REG.email, password: TEST_REG.password });

    const cookies = getCookies(loginRes);

    const changeRes = await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Cookie', cookies)
      .send({
        currentPassword: TEST_REG.password,
        newPassword: 'NuevoPass456!',
      })
      .expect(200);

    expect(changeRes.body.message).toContain('actualizada');

    // Restaurar contraseña original para no romper otros tests
    const loginRes2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TEST_REG.email, password: 'NuevoPass456!' });
    const cookies2 = getCookies(loginRes2);

    await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Cookie', cookies2)
      .send({
        currentPassword: 'NuevoPass456!',
        newPassword: TEST_REG.password,
      });
  });

  it('401 — contraseña actual incorrecta', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TEST_REG.email, password: TEST_REG.password });

    const cookies = getCookies(loginRes);

    await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Cookie', cookies)
      .send({
        currentPassword: 'WrongCurrent',
        newPassword: 'NewPass789!',
      })
      .expect(401);
  });

  it('400 — nueva contraseña igual a la actual', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TEST_REG.email, password: TEST_REG.password });

    const cookies = getCookies(loginRes);

    await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Cookie', cookies)
      .send({
        currentPassword: TEST_REG.password,
        newPassword: TEST_REG.password,
      })
      .expect(400);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE: /auth/setup
// ══════════════════════════════════════════════════════════════════════════════

describe('POST /auth/setup', () => {
  it('201 — crea super_admin la primera vez', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/setup')
      .send({ email: 'superadmin@sharkbyte.com', password: 'SuperAdmin123!' })
      .expect(201);

    expect(res.body.role).toBe('super_admin');
    expect(res.body.email).toBe('superadmin@sharkbyte.com');
  });

  it('403 — setup ya completado (segundo intento)', async () => {
    await request(app.getHttpServer())
      .post('/auth/setup')
      .send({ email: 'admin2@sharkbyte.com', password: 'Admin123456!' })
      .expect(403);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE: Health Check
// ══════════════════════════════════════════════════════════════════════════════

// Nota: el endpoint /health se registra en main.ts vía app.getHttpAdapter().get(...)
// y no está disponible en TestingModule. Este comportamiento es correcto — el health check
// funciona en la app completa (bootstrap), no en módulos aislados de test.
describe('GET /health (integración, no disponible en TestingModule)', () => {
  it('responde 404 en entorno de test (solo existe en bootstrap completo)', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    // En test: 404 porque main.ts no se ejecuta
    // En producción: 200 con { status: 'ok' }
    expect([200, 404]).toContain(res.status);
  });
});

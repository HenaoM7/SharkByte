/**
 * Setup compartido para tests E2E — crea la app NestJS con MongoDB en memoria
 *
 * Uso:
 *   import { createTestApp, closeTestApp } from './test-app.setup';
 *   let app: INestApplication;
 *   beforeAll(async () => { app = await createTestApp(); });
 *   afterAll(async () => { await closeTestApp(app); });
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as mongoose from 'mongoose';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

let mongod: MongoMemoryServer;

export async function createTestApp(moduleBuilder?: any): Promise<INestApplication> {
  mongod = await MongoMemoryServer.create();
  const mongoUri = mongod.getUri();

  const module: TestingModule = await (moduleBuilder || Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
      MongooseModule.forRoot(mongoUri),
    ],
  })).compile();

  const app = module.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.init();
  return app;
}

export async function closeTestApp(app: INestApplication) {
  await app.close();
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

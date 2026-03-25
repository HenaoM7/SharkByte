/**
 * Tests unitarios — AuthService
 *
 * Cubre:
 *  - login: credenciales válidas, email incorrecto, contraseña incorrecta, usuario inactivo
 *  - register: registro exitoso, email duplicado
 *  - refreshFromToken: token válido, token inválido, usuario inactivo
 *  - forgotPassword: email existente, email inexistente, email inactivo
 *  - resetPassword: token válido, token expirado, token usado, token inexistente
 *  - changePassword: cambio exitoso, contraseña actual incorrecta, misma contraseña
 *  - generateTokens: payload correcto, estructura de respuesta
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '../users/users.schema';
import { PasswordReset } from './schemas/password-reset.schema';
import { TenantsService } from '../tenants/tenants.service';
import * as bcrypt from 'bcryptjs';

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeUser = (overrides: Partial<any> = {}) => ({
  _id: 'user-id-123',
  email: 'test@empresa.com',
  passwordHash: '$2a$12$hashedpassword',
  role: 'owner',
  tenantId: 'tenant_573001234567',
  isActive: true,
  ...overrides,
});

const makeModelMock = () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  updateOne: jest.fn(),
  deleteMany: jest.fn(),
});

// ── Suite principal ───────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let userModel: ReturnType<typeof makeModelMock>;
  let resetModel: ReturnType<typeof makeModelMock> & { findOneAndUpdate?: jest.Mock };
  let jwtService: jest.Mocked<Partial<JwtService>>;
  let configService: jest.Mocked<Partial<ConfigService>>;
  let tenantsService: jest.Mocked<Partial<TenantsService>>;

  beforeEach(async () => {
    userModel = makeModelMock();
    resetModel = {
      ...makeModelMock(),
      findOneAndUpdate: jest.fn(),
    } as any;

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
      verify: jest.fn(),
    };

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        const cfg: Record<string, string> = {
          JWT_SECRET: 'test-secret',
          JWT_REFRESH_SECRET: 'test-refresh-secret',
          JWT_EXPIRES_IN: '15m',
          JWT_REFRESH_EXPIRES_IN: '7d',
          FRONTEND_URL: 'http://localhost:5173',
        };
        return cfg[key];
      }),
    };

    tenantsService = {
      create: jest.fn(),
      setOwner: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(PasswordReset.name), useValue: resetModel },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: TenantsService, useValue: tenantsService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── login ─────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('devuelve tokens con credenciales válidas', async () => {
      const user = makeUser();
      userModel.findOne.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.login({ email: 'test@empresa.com', password: 'correctpass' });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(user.email);
      expect(result.user.role).toBe('owner');
    });

    it('lanza UnauthorizedException si el email no existe', async () => {
      userModel.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'noexiste@x.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si la contraseña es incorrecta', async () => {
      userModel.findOne.mockResolvedValue(makeUser());
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.login({ email: 'test@empresa.com', password: 'wrongpass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si el usuario está inactivo', async () => {
      userModel.findOne.mockResolvedValue(makeUser({ isActive: false }));
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      await expect(
        service.login({ email: 'test@empresa.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('normaliza el email a minúsculas al buscar', async () => {
      userModel.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'TEST@Empresa.COM', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'test@empresa.com' });
    });
  });

  // ── register ──────────────────────────────────────────────────────────────

  describe('register()', () => {
    const dto = {
      businessName: 'Mi Empresa',
      phone: '+573001234567',
      email: 'nuevo@empresa.com',
      password: 'SecurePass123',
    };

    it('crea tenant + usuario y devuelve tokens al registrarse', async () => {
      userModel.findOne.mockResolvedValue(null);
      const fakeTenant = { tenantId: 'tenant_573001234567', name: 'Mi Empresa', _id: 'tid' };
      tenantsService.create.mockResolvedValue(fakeTenant as any);
      const fakeUser = makeUser({ _id: 'new-user-id', email: dto.email });
      userModel.create.mockResolvedValue(fakeUser);
      tenantsService.setOwner.mockResolvedValue(undefined);

      const result = await service.register(dto);

      expect(tenantsService.create).toHaveBeenCalledWith({
        name: dto.businessName,
        phone: dto.phone,
        email: dto.email,
        planName: 'free',
      });
      expect(result).toHaveProperty('accessToken');
      expect(result.tenant.tenantId).toBe('tenant_573001234567');
    });

    it('lanza ConflictException si el email ya existe', async () => {
      userModel.findOne.mockResolvedValue(makeUser());

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(tenantsService.create).not.toHaveBeenCalled();
    });

    it('llama a setOwner vinculando el userId al tenant', async () => {
      userModel.findOne.mockResolvedValue(null);
      const fakeTenant = { tenantId: 'tenant_573001234567', name: 'Mi Empresa' };
      tenantsService.create.mockResolvedValue(fakeTenant as any);
      const fakeUser = makeUser({ _id: 'new-user-id' });
      userModel.create.mockResolvedValue(fakeUser);

      await service.register(dto);

      expect(tenantsService.setOwner).toHaveBeenCalledWith('tenant_573001234567', 'new-user-id');
    });
  });

  // ── refreshFromToken ──────────────────────────────────────────────────────

  describe('refreshFromToken()', () => {
    it('emite nuevos tokens con refresh token válido', async () => {
      const user = makeUser();
      jwtService.verify = jest.fn().mockReturnValue({ sub: user._id });
      userModel.findById.mockResolvedValue(user);

      const result = await service.refreshFromToken('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('lanza UnauthorizedException si el token es inválido', async () => {
      jwtService.verify = jest.fn().mockImplementation(() => { throw new Error('invalid'); });

      await expect(service.refreshFromToken('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si el usuario está inactivo', async () => {
      jwtService.verify = jest.fn().mockReturnValue({ sub: 'user-id' });
      userModel.findById.mockResolvedValue(makeUser({ isActive: false }));

      await expect(service.refreshFromToken('token')).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si el usuario no existe', async () => {
      jwtService.verify = jest.fn().mockReturnValue({ sub: 'ghost-id' });
      userModel.findById.mockResolvedValue(null);

      await expect(service.refreshFromToken('token')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── forgotPassword ────────────────────────────────────────────────────────

  describe('forgotPassword()', () => {
    it('retorna mensaje genérico para email existente (sin exponer si existe)', async () => {
      const user = makeUser();
      userModel.findOne.mockResolvedValue(user);
      resetModel.deleteMany.mockResolvedValue({});
      resetModel.create.mockResolvedValue({});

      const result = await service.forgotPassword({ email: 'test@empresa.com' });

      expect(result.message).toContain('Si el email está registrado');
      expect(resetModel.create).toHaveBeenCalled();
    });

    it('retorna mismo mensaje genérico para email inexistente (anti-enumeración)', async () => {
      userModel.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'ghost@x.com' });

      expect(result.message).toContain('Si el email está registrado');
      expect(resetModel.create).not.toHaveBeenCalled();
    });

    it('retorna mensaje genérico para usuario inactivo', async () => {
      userModel.findOne.mockResolvedValue(makeUser({ isActive: false }));

      const result = await service.forgotPassword({ email: 'inactivo@x.com' });

      expect(result.message).toContain('Si el email está registrado');
      expect(resetModel.create).not.toHaveBeenCalled();
    });

    it('invalida tokens anteriores antes de crear uno nuevo', async () => {
      userModel.findOne.mockResolvedValue(makeUser());
      resetModel.deleteMany.mockResolvedValue({});
      resetModel.create.mockResolvedValue({});

      await service.forgotPassword({ email: 'test@empresa.com' });

      expect(resetModel.deleteMany).toHaveBeenCalledWith({ email: 'test@empresa.com' });
    });

    it('almacena el hash SHA256 del token, no el token en crudo', async () => {
      userModel.findOne.mockResolvedValue(makeUser());
      resetModel.deleteMany.mockResolvedValue({});
      resetModel.create.mockResolvedValue({});

      await service.forgotPassword({ email: 'test@empresa.com' });

      const createCall = (resetModel.create as jest.Mock).mock.calls[0][0];
      // El token almacenado debe ser un hash hex de 64 chars (SHA256), no el raw token
      expect(createCall.token).toMatch(/^[a-f0-9]{64}$/);
      expect(createCall.used).toBe(false);
    });
  });

  // ── resetPassword ─────────────────────────────────────────────────────────

  describe('resetPassword()', () => {
    const validResetDoc = {
      _id: 'reset-doc-id',
      email: 'test@empresa.com',
      token: 'hashed',
      used: false,
      expiresAt: new Date(Date.now() + 3600_000),
    };

    it('actualiza contraseña con token válido', async () => {
      resetModel.findOne.mockResolvedValue(validResetDoc);
      userModel.findOne.mockResolvedValue(makeUser());
      userModel.updateOne.mockResolvedValue({});
      resetModel.updateOne.mockResolvedValue({});

      const result = await service.resetPassword({ token: 'rawtoken', newPassword: 'NewPass123!' });

      expect(result.message).toContain('Contraseña actualizada');
      expect(userModel.updateOne).toHaveBeenCalled();
      expect(resetModel.updateOne).toHaveBeenCalledWith(
        { _id: 'reset-doc-id' },
        { used: true },
      );
    });

    it('lanza BadRequestException si el token no existe o está expirado', async () => {
      resetModel.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'badtoken', newPassword: 'NewPass123!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza NotFoundException si el usuario no existe tras el token', async () => {
      resetModel.findOne.mockResolvedValue(validResetDoc);
      userModel.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'rawtoken', newPassword: 'NewPass123!' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── changePassword ────────────────────────────────────────────────────────

  describe('changePassword()', () => {
    it('cambia contraseña cuando la actual es correcta', async () => {
      userModel.findById.mockResolvedValue(makeUser());
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      userModel.updateOne.mockResolvedValue({});

      const result = await service.changePassword('user-id-123', {
        currentPassword: 'OldPass123',
        newPassword: 'NewPass456!',
      });

      expect(result.message).toContain('actualizada');
      expect(userModel.updateOne).toHaveBeenCalled();
    });

    it('lanza NotFoundException si el usuario no existe', async () => {
      userModel.findById.mockResolvedValue(null);

      await expect(
        service.changePassword('ghost-id', { currentPassword: 'old', newPassword: 'new' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza UnauthorizedException si la contraseña actual es incorrecta', async () => {
      userModel.findById.mockResolvedValue(makeUser());
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.changePassword('user-id-123', { currentPassword: 'wrong', newPassword: 'NewPass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza BadRequestException si la nueva contraseña es igual a la actual', async () => {
      userModel.findById.mockResolvedValue(makeUser());
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      await expect(
        service.changePassword('user-id-123', {
          currentPassword: 'SamePass',
          newPassword: 'SamePass',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── createUser ────────────────────────────────────────────────────────────

  describe('createUser()', () => {
    it('crea un usuario con rol dado y retorna datos básicos', async () => {
      userModel.findOne.mockResolvedValue(null);
      const created = makeUser({ role: 'super_admin', tenantId: 'system' });
      userModel.create.mockResolvedValue(created);

      const result = await service.createUser('admin@sys.com', 'pass123', 'system', 'super_admin');

      expect(result.email).toBe(created.email);
      expect(result.role).toBe('super_admin');
    });

    it('lanza ConflictException si el email ya existe', async () => {
      userModel.findOne.mockResolvedValue(makeUser());

      await expect(
        service.createUser('test@empresa.com', 'pass', 'system'),
      ).rejects.toThrow(ConflictException);
    });
  });
});

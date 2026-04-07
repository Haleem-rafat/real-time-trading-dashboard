/* eslint-disable @typescript-eslint/unbound-method --
 * `expect(...).toHaveBeenCalled*(serviceMock.method)` is the idiomatic
 * jest way to assert on a mock and is always invoked through its owning
 * object. The rule fires on every jest spec file that uses this pattern.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const userServiceMock = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    const jwtServiceMock = {
      sign: jest.fn().mockReturnValue('signed.jwt.token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userServiceMock },
        { provide: JwtService, useValue: jwtServiceMock },
      ],
    }).compile();

    service = module.get(AuthService);
    userService = module.get(UserService);
    jwtService = module.get(JwtService);
  });

  describe('register', () => {
    it('hashes the password and returns a JWT', async () => {
      userService.findByEmail.mockResolvedValue(null);
      userService.create.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        toJSON: () => ({ id: 'u1', email: 'a@b.com' }),
      } as never);

      const result = await service.register({
        email: 'a@b.com',
        password: 'secret123',
      });

      expect(userService.create).toHaveBeenCalled();
      const createArg = userService.create.mock.calls[0][0];
      expect(createArg.email).toBe('a@b.com');
      // password should be hashed (bcrypt prefix), not equal to plaintext
      expect(createArg.password).not.toBe('secret123');
      expect(createArg.password.startsWith('$2')).toBe(true);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'u1',
        email: 'a@b.com',
      });
      expect(result.access_token).toBe('signed.jwt.token');
      expect(result.user).toMatchObject({ id: 'u1', email: 'a@b.com' });
    });

    it('throws ConflictException when email already exists', async () => {
      userService.findByEmail.mockResolvedValue({ id: 'u1' } as never);
      await expect(
        service.register({ email: 'a@b.com', password: 'secret123' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('returns a JWT for valid credentials', async () => {
      const hashed = await bcrypt.hash('secret123', 10);
      userService.findByEmail.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        password: hashed,
        toJSON: () => ({ id: 'u1', email: 'a@b.com' }),
      } as never);

      const result = await service.login({
        email: 'a@b.com',
        password: 'secret123',
      });

      expect(userService.findByEmail).toHaveBeenCalledWith('a@b.com', true);
      expect(result.access_token).toBe('signed.jwt.token');
    });

    it('throws UnauthorizedException for unknown email', async () => {
      userService.findByEmail.mockResolvedValue(null);
      await expect(
        service.login({ email: 'a@b.com', password: 'secret123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      const hashed = await bcrypt.hash('correct-password', 10);
      userService.findByEmail.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        password: hashed,
        toJSON: () => ({ id: 'u1', email: 'a@b.com' }),
      } as never);

      await expect(
        service.login({ email: 'a@b.com', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});

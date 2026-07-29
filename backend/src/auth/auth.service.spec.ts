import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { DB } from '../database/database.module';

// ── mock argon2 ──────────────────────────────────────────────────────────────
jest.mock('@node-rs/argon2', () => ({
  hash: jest.fn().mockResolvedValue('$argon2id$mock-hash'),
  verify: jest.fn().mockResolvedValue(false),
}));

import { hash, verify } from '@node-rs/argon2';

// ── fixtures ─────────────────────────────────────────────────────────────────

const MOCK_USER = {
  id: 'a1b2c3d4-0000-0000-0000-000000000001',
  email: 'alice@example.com',
  passwordHash: '$argon2id$stored',
  isActive: true,
  isSuperAdmin: false,
  firstName: 'Alice',
  lastName: 'Test',
  organizationId: null,
  departmentId: null,
  isEmailVerified: false,
  emailNotifications: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── db mock factory ───────────────────────────────────────────────────────────

function chainWith(result: unknown[]) {
  return {
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(result),
    orderBy: jest.fn().mockResolvedValue(result),
  };
}

function makeMockDb() {
  return {
    select: jest.fn(() => chainWith([])),
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        returning: jest.fn().mockResolvedValue([{ id: 'token-id' }]),
      })),
    })),
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn().mockResolvedValue([]),
      })),
    })),
  };
}

// ── suite ─────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(async () => {
    db = makeMockDb();

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DB, useValue: db },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('mock.jwt.token') },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-secret') },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
    (hash as jest.Mock).mockResolvedValue('$argon2id$mock-hash');
    (verify as jest.Mock).mockResolvedValue(false);
  });

  // ── hashPassword ────────────────────────────────────────────────────────────

  describe('hashPassword', () => {
    it('delegates to argon2 hash and returns the result', async () => {
      (hash as jest.Mock).mockResolvedValueOnce('$argon2id$v=19$result');
      const result = await service.hashPassword('s3cr3t');
      expect(result).toBe('$argon2id$v=19$result');
      expect(hash).toHaveBeenCalledWith('s3cr3t');
    });
  });

  // ── login ───────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('throws UnauthorizedException when user does not exist', async () => {
      db.select.mockReturnValue(chainWith([])); // no user found
      await expect(service.login('nobody@example.com', 'pass')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      db.select.mockReturnValue(chainWith([MOCK_USER]));
      (verify as jest.Mock).mockResolvedValueOnce(false); // wrong password
      await expect(service.login(MOCK_USER.email, 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('returns accessToken and refreshToken on valid credentials', async () => {
      db.select.mockReturnValue(chainWith([MOCK_USER]));
      (verify as jest.Mock).mockResolvedValueOnce(true); // correct password
      (hash as jest.Mock).mockResolvedValueOnce('$argon2id$token-hash');

      const result = await service.login(MOCK_USER.email, 'correct');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.accessToken).toBe('mock.jwt.token');
    });
  });

  // ── getUserWithPermissions ──────────────────────────────────────────────────

  describe('getUserWithPermissions', () => {
    it('returns null when user does not exist', async () => {
      db.select.mockReturnValue(chainWith([]));
      const result = await service.getUserWithPermissions('non-existent-id');
      expect(result).toBeNull();
    });

    it('returns user with deduplicated permissions', async () => {
      // First select → user row; second select → permission rows (with duplicate)
      db.select
        .mockReturnValueOnce(chainWith([MOCK_USER]))
        .mockReturnValueOnce(
          chainWith([
            { permissionName: 'users.view' },
            { permissionName: 'workflows.view' },
            { permissionName: 'users.view' }, // duplicate — should be removed
          ]),
        );

      const result = await service.getUserWithPermissions(MOCK_USER.id);
      expect(result).not.toBeNull();
      expect(result!.permissions).toHaveLength(2);
      expect(result!.permissions).toContain('users.view');
      expect(result!.permissions).toContain('workflows.view');
    });

    it('does not expose passwordHash in the result', async () => {
      db.select
        .mockReturnValueOnce(chainWith([MOCK_USER]))
        .mockReturnValueOnce(chainWith([]));

      const result = await service.getUserWithPermissions(MOCK_USER.id);
      expect(result).not.toHaveProperty('passwordHash');
    });
  });
});

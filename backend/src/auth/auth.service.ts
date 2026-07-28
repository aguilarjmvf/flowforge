import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { hash, verify } from '@node-rs/argon2';
import { eq, and } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../database/database.module';
import * as schema from '../database/schema';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private db: NodePgDatabase<typeof schema>,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.email, email), eq(schema.users.isActive, true)));

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await verify(user.passwordHash, password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user.id, user.email);
  }

  async refresh(token: string) {
    const tokenHash = await hash(token);
    const [stored] = await this.db
      .select()
      .from(schema.refreshTokens)
      .where(
        and(
          eq(schema.refreshTokens.tokenHash, tokenHash),
          eq(schema.refreshTokens.isRevoked, false),
        ),
      );

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.db
      .update(schema.refreshTokens)
      .set({ isRevoked: true })
      .where(eq(schema.refreshTokens.id, stored.id));

    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, stored.userId));

    if (!user || !user.isActive) throw new UnauthorizedException();

    return this.issueTokens(user.id, user.email);
  }

  async logout(token: string) {
    const tokenHash = await hash(token);
    await this.db
      .update(schema.refreshTokens)
      .set({ isRevoked: true })
      .where(eq(schema.refreshTokens.tokenHash, tokenHash));
  }

  async getUserWithPermissions(userId: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId));

    if (!user) return null;

    const roleRows = await this.db
      .select({ permissionName: schema.permissions.name })
      .from(schema.userRoles)
      .innerJoin(schema.rolePermissions, eq(schema.userRoles.roleId, schema.rolePermissions.roleId))
      .innerJoin(schema.permissions, eq(schema.rolePermissions.permissionId, schema.permissions.id))
      .where(eq(schema.userRoles.userId, userId));

    const permissions = [...new Set(roleRows.map((r) => r.permissionName))];

    const { passwordHash: _, ...safeUser } = user;
    return { ...safeUser, permissions };
  }

  async hashPassword(password: string) {
    return hash(password);
  }

  private async issueTokens(userId: string, email: string) {
    const accessToken = this.jwtService.sign(
      { sub: userId, email },
      {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN'),
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN'),
      },
    );

    const tokenHash = await hash(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.db.insert(schema.refreshTokens).values({
      userId,
      tokenHash,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }
}

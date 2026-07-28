import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../database/database.module';
import * as schema from '../database/schema';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DB) private db: NodePgDatabase<typeof schema>,
    private authService: AuthService,
  ) {}

  async findAll(organizationId?: string) {
    const rows = await this.db.select().from(schema.users);
    return rows
      .filter((u) => !organizationId || u.organizationId === organizationId)
      .map(({ passwordHash: _, ...u }) => u);
  }

  async findOne(id: string) {
    const [user] = await this.db.select().from(schema.users).where(eq(schema.users.id, id));
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  async create(dto: CreateUserDto) {
    const [existing] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, dto.email));

    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await this.authService.hashPassword(dto.password);

    const [user] = await this.db
      .insert(schema.users)
      .values({ ...dto, passwordHash })
      .returning();

    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    const [updated] = await this.db
      .update(schema.users)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(schema.users.id, id))
      .returning();
    const { passwordHash: _, ...safe } = updated;
    return safe;
  }

  async deactivate(id: string) {
    await this.findOne(id);
    await this.db
      .update(schema.users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.users.id, id));
  }

  async assignRoles(userId: string, roleIds: string[], assignedBy: string) {
    await this.findOne(userId);
    await this.db.delete(schema.userRoles).where(eq(schema.userRoles.userId, userId));
    if (roleIds.length > 0) {
      await this.db.insert(schema.userRoles).values(
        roleIds.map((roleId) => ({ userId, roleId, assignedBy })),
      );
    }
  }
}

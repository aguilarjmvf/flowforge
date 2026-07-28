import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../database/database.module';
import * as schema from '../database/schema';
import { CreateRoleDto, UpdateRoleDto } from './dto/roles.dto';

@Injectable()
export class RolesService {
  constructor(@Inject(DB) private db: NodePgDatabase<typeof schema>) {}

  async findAll(organizationId?: string) {
    const rows = await this.db.select().from(schema.roles);
    return organizationId ? rows.filter((r) => r.organizationId === organizationId || r.isSystem) : rows;
  }

  async findOne(id: string) {
    const [role] = await this.db.select().from(schema.roles).where(eq(schema.roles.id, id));
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(dto: CreateRoleDto) {
    const [role] = await this.db.insert(schema.roles).values(dto).returning();
    return role;
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.findOne(id);
    if (role.isSystem) throw new BadRequestException('Cannot modify system roles');
    const [updated] = await this.db
      .update(schema.roles)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(schema.roles.id, id))
      .returning();
    return updated;
  }

  async delete(id: string) {
    const role = await this.findOne(id);
    if (role.isSystem) throw new BadRequestException('Cannot delete system roles');
    await this.db.delete(schema.rolePermissions).where(eq(schema.rolePermissions.roleId, id));
    await this.db.delete(schema.userRoles).where(eq(schema.userRoles.roleId, id));
    await this.db.delete(schema.roles).where(eq(schema.roles.id, id));
  }

  async assignPermissions(roleId: string, permissionIds: string[]) {
    await this.findOne(roleId);
    await this.db.delete(schema.rolePermissions).where(eq(schema.rolePermissions.roleId, roleId));
    if (permissionIds.length > 0) {
      await this.db
        .insert(schema.rolePermissions)
        .values(permissionIds.map((permissionId) => ({ roleId, permissionId })));
    }
  }

  async getPermissions(roleId: string) {
    return this.db
      .select({ permission: schema.permissions })
      .from(schema.rolePermissions)
      .innerJoin(schema.permissions, eq(schema.rolePermissions.permissionId, schema.permissions.id))
      .where(eq(schema.rolePermissions.roleId, roleId));
  }
}

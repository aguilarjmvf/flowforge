import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../database/database.module';
import * as schema from '../database/schema';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/departments.dto';

@Injectable()
export class DepartmentsService {
  constructor(@Inject(DB) private db: NodePgDatabase<typeof schema>) {}

  async findAll(organizationId?: string) {
    const rows = await this.db.select().from(schema.departments);
    return organizationId ? rows.filter((d) => d.organizationId === organizationId) : rows;
  }

  async findOne(id: string) {
    const [dept] = await this.db
      .select()
      .from(schema.departments)
      .where(eq(schema.departments.id, id));
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async create(dto: CreateDepartmentDto) {
    const [dept] = await this.db.insert(schema.departments).values(dto).returning();
    return dept;
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    await this.findOne(id);
    const [updated] = await this.db
      .update(schema.departments)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(schema.departments.id, id))
      .returning();
    return updated;
  }

  async deactivate(id: string) {
    await this.findOne(id);
    await this.db
      .update(schema.departments)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.departments.id, id));
  }
}

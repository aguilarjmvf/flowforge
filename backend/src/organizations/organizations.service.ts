import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../database/database.module';
import * as schema from '../database/schema';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organizations.dto';

@Injectable()
export class OrganizationsService {
  constructor(@Inject(DB) private db: NodePgDatabase<typeof schema>) {}

  async findAll() {
    return this.db.select().from(schema.organizations);
  }

  async findOne(id: string) {
    const [org] = await this.db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.id, id));
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async create(dto: CreateOrganizationDto) {
    const [existing] = await this.db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.slug, dto.slug));
    if (existing) throw new ConflictException('Slug already in use');

    const [org] = await this.db.insert(schema.organizations).values(dto).returning();
    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    await this.findOne(id);
    const [updated] = await this.db
      .update(schema.organizations)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(schema.organizations.id, id))
      .returning();
    return updated;
  }
}

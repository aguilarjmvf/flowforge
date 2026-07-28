import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../database/database.module';
import * as schema from '../database/schema';
import {
  CreateFormDto, UpdateFormDto,
  CreateFieldDto, UpdateFieldDto, ReorderFieldsDto,
} from './dto/forms.dto';

@Injectable()
export class FormsService {
  constructor(@Inject(DB) private db: NodePgDatabase<typeof schema>) {}

  // ── Forms ─────────────────────────────────────────────────────────────────────

  async findAll(workflowId?: string) {
    const rows = await this.db.select().from(schema.forms);
    return workflowId ? rows.filter((f) => f.workflowId === workflowId) : rows;
  }

  async findOne(id: string) {
    const [form] = await this.db.select().from(schema.forms).where(eq(schema.forms.id, id));
    if (!form) throw new NotFoundException('Form not found');

    const fields = await this.db
      .select()
      .from(schema.formFields)
      .where(eq(schema.formFields.formId, id));

    fields.sort((a, b) => a.displayOrder - b.displayOrder);
    return { ...form, fields };
  }

  async create(dto: CreateFormDto, userId: string) {
    const [form] = await this.db
      .insert(schema.forms)
      .values({ ...dto, createdBy: userId })
      .returning();
    return { ...form, fields: [] };
  }

  async update(id: string, dto: UpdateFormDto) {
    await this.findOne(id);
    const [updated] = await this.db
      .update(schema.forms)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(schema.forms.id, id))
      .returning();
    return updated;
  }

  async delete(id: string) {
    await this.findOne(id);
    await this.db.delete(schema.formFields).where(eq(schema.formFields.formId, id));
    await this.db.delete(schema.forms).where(eq(schema.forms.id, id));
  }

  // ── Fields ────────────────────────────────────────────────────────────────────

  async createField(formId: string, dto: CreateFieldDto) {
    await this.findOne(formId);
    await this.assertUniqueKey(formId, dto.fieldKey);

    const [field] = await this.db
      .insert(schema.formFields)
      .values({ ...dto, formId })
      .returning();
    return field;
  }

  async updateField(formId: string, fieldId: string, dto: UpdateFieldDto) {
    await this.findOne(formId);
    await this.getField(formId, fieldId);

    if (dto.fieldKey) {
      await this.assertUniqueKey(formId, dto.fieldKey, fieldId);
    }

    const [updated] = await this.db
      .update(schema.formFields)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(schema.formFields.id, fieldId))
      .returning();
    return updated;
  }

  async deleteField(formId: string, fieldId: string) {
    await this.findOne(formId);
    await this.getField(formId, fieldId);
    await this.db.delete(schema.formFields).where(eq(schema.formFields.id, fieldId));
  }

  async reorderFields(formId: string, dto: ReorderFieldsDto) {
    await this.findOne(formId);
    for (const { id, displayOrder } of dto.fields) {
      await this.db
        .update(schema.formFields)
        .set({ displayOrder, updatedAt: new Date() })
        .where(and(eq(schema.formFields.id, id), eq(schema.formFields.formId, formId)));
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async getField(formId: string, fieldId: string) {
    const [field] = await this.db
      .select()
      .from(schema.formFields)
      .where(and(eq(schema.formFields.id, fieldId), eq(schema.formFields.formId, formId)));
    if (!field) throw new NotFoundException('Field not found in this form');
    return field;
  }

  private async assertUniqueKey(formId: string, fieldKey: string, excludeId?: string) {
    const existing = await this.db
      .select()
      .from(schema.formFields)
      .where(and(eq(schema.formFields.formId, formId), eq(schema.formFields.fieldKey, fieldKey)));

    const conflict = existing.find((f) => f.id !== excludeId);
    if (conflict) throw new ConflictException(`Field key "${fieldKey}" already exists in this form`);
  }
}

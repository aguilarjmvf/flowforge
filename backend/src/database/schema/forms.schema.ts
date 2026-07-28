import { pgTable, uuid, varchar, text, integer, boolean, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { workflows } from './workflows.schema';
import { users } from './users.schema';

export const fieldTypeEnum = pgEnum('field_type', [
  'text',
  'long_text',
  'number',
  'currency',
  'date',
  'datetime',
  'dropdown',
  'radio',
  'checkbox',
  'file_upload',
  'user_select',
  'department_select',
]);

export const forms = pgTable('forms', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').references(() => workflows.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const formFields = pgTable('form_fields', {
  id: uuid('id').primaryKey().defaultRandom(),
  formId: uuid('form_id').notNull().references(() => forms.id),
  label: varchar('label', { length: 255 }).notNull(),
  fieldKey: varchar('field_key', { length: 100 }).notNull(),
  fieldType: fieldTypeEnum('field_type').notNull(),
  placeholder: varchar('placeholder', { length: 255 }),
  defaultValue: text('default_value'),
  isRequired: boolean('is_required').notNull().default(false),
  displayOrder: integer('display_order').notNull().default(0),
  // For dropdown/radio/checkbox: [{ label: string, value: string }]
  options: jsonb('options').$type<{ label: string; value: string }[]>(),
  // Type-specific validation: { minLength, maxLength, min, max, pattern, maxSizeMb, allowedTypes }
  validationRules: jsonb('validation_rules').$type<Record<string, unknown>>(),
  // Conditional visibility: { field: string, operator: 'eq'|'neq'|'gt'|'lt', value: unknown }
  conditions: jsonb('conditions').$type<{ field: string; operator: string; value: unknown }[]>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Form = typeof forms.$inferSelect;
export type NewForm = typeof forms.$inferInsert;
export type FormField = typeof formFields.$inferSelect;
export type NewFormField = typeof formFields.$inferInsert;

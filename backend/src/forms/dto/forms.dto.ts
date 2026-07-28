import { z } from 'zod';

const FIELD_TYPES = [
  'text', 'long_text', 'number', 'currency', 'date', 'datetime',
  'dropdown', 'radio', 'checkbox', 'file_upload', 'user_select', 'department_select',
] as const;

const OptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

const ValidationRulesSchema = z.object({
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(1).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  maxSizeMb: z.number().positive().optional(),
  allowedTypes: z.array(z.string()).optional(),
}).optional();

const ConditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(['eq', 'neq', 'gt', 'lt', 'contains']),
  value: z.unknown(),
});

export const CreateFormSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  workflowId: z.string().uuid().optional(),
});

export const UpdateFormSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  workflowId: z.string().uuid().nullable().optional(),
});

export const CreateFieldSchema = z.object({
  label: z.string().min(1).max(255),
  fieldKey: z.string().min(1).max(100).regex(/^[a-z][a-z0-9_]*$/, 'Field key must be snake_case'),
  fieldType: z.enum(FIELD_TYPES),
  placeholder: z.string().max(255).optional(),
  defaultValue: z.string().optional(),
  isRequired: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
  options: z.array(OptionSchema).optional(),
  validationRules: ValidationRulesSchema,
  conditions: z.array(ConditionSchema).optional(),
});

export const UpdateFieldSchema = CreateFieldSchema.partial();

export const ReorderFieldsSchema = z.object({
  fields: z.array(z.object({
    id: z.string().uuid(),
    displayOrder: z.number().int().min(0),
  })),
});

export type CreateFormDto = z.infer<typeof CreateFormSchema>;
export type UpdateFormDto = z.infer<typeof UpdateFormSchema>;
export type CreateFieldDto = z.infer<typeof CreateFieldSchema>;
export type UpdateFieldDto = z.infer<typeof UpdateFieldSchema>;
export type ReorderFieldsDto = z.infer<typeof ReorderFieldsSchema>;

import { z } from 'zod';

export const CreateInstanceSchema = z.object({
  workflowId: z.string().uuid(),
  formId: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  formData: z.record(z.string(), z.unknown()).optional().default({}),
});

export const UpdateInstanceSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  formData: z.record(z.string(), z.unknown()).optional(),
});

export const ExecuteTransitionSchema = z.object({
  action: z.enum(['submit', 'approve', 'reject', 'return']),
  notes: z.string().optional(),
});

export type CreateInstanceDto = z.infer<typeof CreateInstanceSchema>;
export type UpdateInstanceDto = z.infer<typeof UpdateInstanceSchema>;
export type ExecuteTransitionDto = z.infer<typeof ExecuteTransitionSchema>;

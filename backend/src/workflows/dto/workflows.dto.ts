import { z } from 'zod';

export const CreateWorkflowSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  organizationId: z.string().uuid().optional(),
});

export const UpdateWorkflowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

export const CreateStepSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  stepType: z.enum(['start', 'review', 'approval', 'end']),
  order: z.number().int().min(0),
  assignedUserId: z.string().uuid().optional(),
  assignedRoleId: z.string().uuid().optional(),
  assignedDepartmentId: z.string().uuid().optional(),
  dueDateDays: z.number().int().min(1).optional(),
  isStart: z.boolean().optional().default(false),
  isEnd: z.boolean().optional().default(false),
});

export const UpdateStepSchema = CreateStepSchema.partial();

export const ReorderStepsSchema = z.object({
  steps: z.array(z.object({ id: z.string().uuid(), order: z.number().int().min(0) })),
});

export const CreateTransitionSchema = z.object({
  fromStepId: z.string().uuid(),
  toStepId: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  action: z.enum(['submit', 'approve', 'reject', 'return']),
});

export const UpdateTransitionSchema = CreateTransitionSchema.partial();

export type CreateWorkflowDto = z.infer<typeof CreateWorkflowSchema>;
export type UpdateWorkflowDto = z.infer<typeof UpdateWorkflowSchema>;
export type CreateStepDto = z.infer<typeof CreateStepSchema>;
export type UpdateStepDto = z.infer<typeof UpdateStepSchema>;
export type ReorderStepsDto = z.infer<typeof ReorderStepsSchema>;
export type CreateTransitionDto = z.infer<typeof CreateTransitionSchema>;
export type UpdateTransitionDto = z.infer<typeof UpdateTransitionSchema>;

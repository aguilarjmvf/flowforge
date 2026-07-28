import { z } from 'zod';

export const CreateDepartmentSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  organizationId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
});

export const UpdateDepartmentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  parentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

export type CreateDepartmentDto = z.infer<typeof CreateDepartmentSchema>;
export type UpdateDepartmentDto = z.infer<typeof UpdateDepartmentSchema>;

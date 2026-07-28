import { z } from 'zod';

export const CreateRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  organizationId: z.string().uuid().optional(),
});

export const UpdateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});

export const AssignPermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid()),
});

export type CreateRoleDto = z.infer<typeof CreateRoleSchema>;
export type UpdateRoleDto = z.infer<typeof UpdateRoleSchema>;
export type AssignPermissionsDto = z.infer<typeof AssignPermissionsSchema>;

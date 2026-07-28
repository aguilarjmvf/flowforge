import { pgTable, uuid, varchar, text, timestamp, jsonb, pgEnum, integer } from 'drizzle-orm/pg-core';
import { workflows } from './workflows.schema';
import { workflowSteps } from './workflows.schema';
import { forms } from './forms.schema';
import { users } from './users.schema';
import { roles } from './roles.schema';
import { departments } from './departments.schema';

export const instanceStatusEnum = pgEnum('instance_status', [
  'draft',
  'in_progress',
  'completed',
  'rejected',
  'cancelled',
]);

export const taskStatusEnum = pgEnum('task_status', [
  'pending',
  'in_progress',
  'completed',
  'cancelled',
]);

export const taskActionEnum = pgEnum('task_action', [
  'submit',
  'approve',
  'reject',
  'return',
]);

export const workflowInstances = pgTable('workflow_instances', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id),
  formId: uuid('form_id').references(() => forms.id),
  referenceNumber: varchar('reference_number', { length: 50 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  status: instanceStatusEnum('status').notNull().default('draft'),
  currentStepId: uuid('current_step_id').references(() => workflowSteps.id),
  formData: jsonb('form_data').$type<Record<string, unknown>>().default({}),
  submittedBy: uuid('submitted_by').notNull().references(() => users.id),
  submittedAt: timestamp('submitted_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowInstanceId: uuid('workflow_instance_id').notNull().references(() => workflowInstances.id),
  workflowStepId: uuid('workflow_step_id').notNull().references(() => workflowSteps.id),
  assignedUserId: uuid('assigned_user_id').references(() => users.id),
  assignedRoleId: uuid('assigned_role_id').references(() => roles.id),
  assignedDepartmentId: uuid('assigned_department_id').references(() => departments.id),
  status: taskStatusEnum('status').notNull().default('pending'),
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  actionTaken: taskActionEnum('action_taken'),
  notes: text('notes'),
  completedBy: uuid('completed_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type WorkflowInstance = typeof workflowInstances.$inferSelect;
export type NewWorkflowInstance = typeof workflowInstances.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

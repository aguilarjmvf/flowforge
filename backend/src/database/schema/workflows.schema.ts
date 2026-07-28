import { pgTable, uuid, varchar, text, integer, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';
import { users } from './users.schema';
import { roles } from './roles.schema';
import { departments } from './departments.schema';

export const workflowStatusEnum = pgEnum('workflow_status', ['draft', 'published', 'archived']);
export const stepTypeEnum = pgEnum('step_type', ['start', 'review', 'approval', 'end']);
export const transitionActionEnum = pgEnum('transition_action', ['submit', 'approve', 'reject', 'return']);

export const workflows = pgTable('workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: workflowStatusEnum('status').notNull().default('draft'),
  version: integer('version').notNull().default(1),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const workflowSteps = pgTable('workflow_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  stepType: stepTypeEnum('step_type').notNull(),
  order: integer('order').notNull(),
  assignedUserId: uuid('assigned_user_id').references(() => users.id),
  assignedRoleId: uuid('assigned_role_id').references(() => roles.id),
  assignedDepartmentId: uuid('assigned_department_id').references(() => departments.id),
  dueDateDays: integer('due_date_days'),
  isStart: boolean('is_start').notNull().default(false),
  isEnd: boolean('is_end').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const workflowTransitions = pgTable('workflow_transitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id),
  fromStepId: uuid('from_step_id').notNull().references(() => workflowSteps.id),
  toStepId: uuid('to_step_id').references(() => workflowSteps.id),
  name: varchar('name', { length: 100 }).notNull(),
  action: transitionActionEnum('action').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;
export type WorkflowStep = typeof workflowSteps.$inferSelect;
export type NewWorkflowStep = typeof workflowSteps.$inferInsert;
export type WorkflowTransition = typeof workflowTransitions.$inferSelect;

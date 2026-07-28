import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { workflowInstances } from './workflow-instances.schema';
import { workflowSteps } from './workflows.schema';
import { tasks } from './workflow-instances.schema';
import { users } from './users.schema';

export const approvalDecisionEnum = pgEnum('approval_decision', [
  'approved',
  'rejected',
  'returned',
]);

export const approvals = pgTable('approvals', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowInstanceId: uuid('workflow_instance_id').notNull().references(() => workflowInstances.id),
  workflowStepId: uuid('workflow_step_id').notNull().references(() => workflowSteps.id),
  taskId: uuid('task_id').notNull().references(() => tasks.id),
  approverId: uuid('approver_id').notNull().references(() => users.id),
  decision: approvalDecisionEnum('decision').notNull(),
  comments: text('comments'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Approval = typeof approvals.$inferSelect;
export type NewApproval = typeof approvals.$inferInsert;

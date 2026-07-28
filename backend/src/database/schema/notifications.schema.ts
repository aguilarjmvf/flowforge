import { pgTable, uuid, varchar, text, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const notificationTypeEnum = pgEnum('notification_type', [
  'task_assigned',
  'workflow_submitted',
  'workflow_approved',
  'workflow_rejected',
  'workflow_returned',
  'workflow_completed',
  'general',
]);

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  type: notificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  entityType: varchar('entity_type', { length: 100 }),
  entityId: uuid('entity_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

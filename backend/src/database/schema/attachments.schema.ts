import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { workflowInstances } from './workflow-instances.schema';
import { users } from './users.schema';

export const attachments = pgTable('attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowInstanceId: uuid('workflow_instance_id').notNull().references(() => workflowInstances.id),
  uploadedBy: uuid('uploaded_by').notNull().references(() => users.id),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  storageName: varchar('storage_name', { length: 255 }).notNull().unique(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;

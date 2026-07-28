import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../database/database.module';
import * as schema from '../database/schema';

type NotificationType = typeof schema.notificationTypeEnum.enumValues[number];

export interface CreateNotificationOptions {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(@Inject(DB) private db: NodePgDatabase<typeof schema>) {}

  async create(options: CreateNotificationOptions): Promise<void> {
    await this.db.insert(schema.notifications).values({
      userId: options.userId,
      type: options.type,
      title: options.title,
      message: options.message,
      entityType: options.entityType ?? null,
      entityId: options.entityId ?? null,
    });
  }

  async findMyNotifications(userId: string, unreadOnly = false) {
    const rows = await this.db
      .select()
      .from(schema.notifications)
      .where(
        unreadOnly
          ? and(eq(schema.notifications.userId, userId), eq(schema.notifications.isRead, false))
          : eq(schema.notifications.userId, userId),
      )
      .orderBy(desc(schema.notifications.createdAt))
      .limit(50);
    return rows;
  }

  async countUnread(userId: string): Promise<number> {
    const rows = await this.db
      .select()
      .from(schema.notifications)
      .where(and(eq(schema.notifications.userId, userId), eq(schema.notifications.isRead, false)));
    return rows.length;
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    await this.db
      .update(schema.notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(schema.notifications.id, notificationId),
          eq(schema.notifications.userId, userId),
        ),
      );
  }

  async markAllRead(userId: string): Promise<void> {
    await this.db
      .update(schema.notifications)
      .set({ isRead: true })
      .where(eq(schema.notifications.userId, userId));
  }
}

import { Injectable, Inject } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../database/database.module';
import * as schema from '../database/schema';

export interface LogEventOptions {
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

@Injectable()
export class AuditLogsService {
  constructor(@Inject(DB) private db: NodePgDatabase<typeof schema>) {}

  async log(options: LogEventOptions): Promise<void> {
    await this.db.insert(schema.auditLogs).values({
      userId: options.userId ?? null,
      action: options.action,
      entityType: options.entityType ?? null,
      entityId: options.entityId ?? null,
      metadata: options.metadata ?? null,
      ipAddress: options.ipAddress ?? null,
    });
  }

  async findAll(filters: {
    userId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    limit?: number;
  }) {
    const rows = await this.db
      .select()
      .from(schema.auditLogs)
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(filters.limit ?? 100);

    return rows.filter((r) => {
      if (filters.userId && r.userId !== filters.userId) return false;
      if (filters.action && r.action !== filters.action) return false;
      if (filters.entityType && r.entityType !== filters.entityType) return false;
      if (filters.entityId && r.entityId !== filters.entityId) return false;
      return true;
    });
  }
}

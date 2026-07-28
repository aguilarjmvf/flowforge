import { Injectable, Inject } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../database/database.module';
import * as schema from '../database/schema';

@Injectable()
export class ApprovalsService {
  constructor(@Inject(DB) private db: NodePgDatabase<typeof schema>) {}

  async findByInstance(instanceId: string) {
    return this.db
      .select({
        approval: schema.approvals,
        approver: {
          id: schema.users.id,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          email: schema.users.email,
        },
        step: {
          id: schema.workflowSteps.id,
          name: schema.workflowSteps.name,
        },
      })
      .from(schema.approvals)
      .leftJoin(schema.users, eq(schema.approvals.approverId, schema.users.id))
      .leftJoin(schema.workflowSteps, eq(schema.approvals.workflowStepId, schema.workflowSteps.id))
      .where(eq(schema.approvals.workflowInstanceId, instanceId))
      .orderBy(schema.approvals.createdAt);
  }

  async findAll(filters: { instanceId?: string; approverId?: string; decision?: string }) {
    const rows = await this.db
      .select({
        approval: schema.approvals,
        approver: {
          id: schema.users.id,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          email: schema.users.email,
        },
        step: {
          id: schema.workflowSteps.id,
          name: schema.workflowSteps.name,
        },
      })
      .from(schema.approvals)
      .leftJoin(schema.users, eq(schema.approvals.approverId, schema.users.id))
      .leftJoin(schema.workflowSteps, eq(schema.approvals.workflowStepId, schema.workflowSteps.id))
      .orderBy(desc(schema.approvals.createdAt));

    return rows.filter(({ approval }) => {
      if (filters.instanceId && approval.workflowInstanceId !== filters.instanceId) return false;
      if (filters.approverId && approval.approverId !== filters.approverId) return false;
      if (filters.decision && approval.decision !== filters.decision) return false;
      return true;
    });
  }
}

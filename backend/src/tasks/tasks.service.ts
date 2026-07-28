import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, or } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../database/database.module';
import * as schema from '../database/schema';

@Injectable()
export class TasksService {
  constructor(@Inject(DB) private db: NodePgDatabase<typeof schema>) {}

  async findMyTasks(userId: string, status?: string) {
    const userRows = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId));
    const user = userRows[0];

    const userRoleRows = await this.db
      .select({ roleId: schema.userRoles.roleId })
      .from(schema.userRoles)
      .where(eq(schema.userRoles.userId, userId));
    const roleIds = userRoleRows.map((r) => r.roleId);

    const allTasks = await this.db
      .select({
        task: schema.tasks,
        instance: schema.workflowInstances,
        step: schema.workflowSteps,
      })
      .from(schema.tasks)
      .leftJoin(schema.workflowInstances, eq(schema.tasks.workflowInstanceId, schema.workflowInstances.id))
      .leftJoin(schema.workflowSteps, eq(schema.tasks.workflowStepId, schema.workflowSteps.id));

    return allTasks.filter(({ task }) => {
      if (status && task.status !== status) return false;

      const isAssignedToUser = task.assignedUserId === userId;
      const isAssignedToRole = task.assignedRoleId && roleIds.includes(task.assignedRoleId);
      const isAssignedToDept = user?.departmentId && task.assignedDepartmentId === user.departmentId;

      return isAssignedToUser || isAssignedToRole || isAssignedToDept;
    });
  }

  async findOne(taskId: string) {
    const rows = await this.db
      .select({
        task: schema.tasks,
        instance: schema.workflowInstances,
        step: schema.workflowSteps,
      })
      .from(schema.tasks)
      .leftJoin(schema.workflowInstances, eq(schema.tasks.workflowInstanceId, schema.workflowInstances.id))
      .leftJoin(schema.workflowSteps, eq(schema.tasks.workflowStepId, schema.workflowSteps.id))
      .where(eq(schema.tasks.id, taskId));

    if (!rows[0]) throw new NotFoundException('Task not found');
    return rows[0];
  }

  async findByInstance(instanceId: string) {
    return this.db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.workflowInstanceId, instanceId));
  }

  async startTask(taskId: string, userId: string) {
    const rows = await this.db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.id, taskId));

    const task = rows[0];
    if (!task) throw new NotFoundException('Task not found');
    if (task.status !== 'pending') {
      throw new BadRequestException('Only pending tasks can be started');
    }

    const [updated] = await this.db
      .update(schema.tasks)
      .set({ status: 'in_progress', updatedAt: new Date() })
      .where(eq(schema.tasks.id, taskId))
      .returning();

    return updated;
  }
}

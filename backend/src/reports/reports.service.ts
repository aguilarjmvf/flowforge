import { Injectable, Inject } from '@nestjs/common';
import { eq, and, count, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../database/database.module';
import * as schema from '../database/schema';

@Injectable()
export class ReportsService {
  constructor(@Inject(DB) private db: NodePgDatabase<typeof schema>) {}

  async getDashboard() {
    const [instances, tasks, workflows] = await Promise.all([
      this.db.select().from(schema.workflowInstances),
      this.db.select().from(schema.tasks),
      this.db.select().from(schema.workflows),
    ]);

    const activeInstances = instances.filter((i) => i.status === 'in_progress').length;
    const draftInstances = instances.filter((i) => i.status === 'draft').length;
    const completedInstances = instances.filter((i) => i.status === 'completed').length;
    const rejectedInstances = instances.filter((i) => i.status === 'rejected').length;
    const pendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length;
    const publishedWorkflows = workflows.filter((w) => w.status === 'published').length;

    // Average completion time (ms) for completed instances
    const completedWithTime = instances.filter(
      (i) => i.status === 'completed' && i.submittedAt && i.completedAt,
    );
    const avgCompletionMs =
      completedWithTime.length > 0
        ? completedWithTime.reduce(
            (sum, i) => sum + (i.completedAt!.getTime() - i.submittedAt!.getTime()),
            0,
          ) / completedWithTime.length
        : null;

    const avgCompletionHours = avgCompletionMs !== null ? avgCompletionMs / 3600000 : null;

    return {
      instances: {
        active: activeInstances,
        draft: draftInstances,
        completed: completedInstances,
        rejected: rejectedInstances,
        total: instances.length,
      },
      tasks: {
        pending: pendingTasks,
        total: tasks.length,
      },
      workflows: {
        published: publishedWorkflows,
        total: workflows.length,
      },
      avgCompletionHours: avgCompletionHours !== null ? Math.round(avgCompletionHours * 10) / 10 : null,
    };
  }

  async getInstanceSummary() {
    const instances = await this.db
      .select()
      .from(schema.workflowInstances);

    const byStatus = instances.reduce<Record<string, number>>((acc, i) => {
      acc[i.status] = (acc[i.status] ?? 0) + 1;
      return acc;
    }, {});

    const byWorkflow: Record<string, number> = {};
    for (const i of instances) {
      byWorkflow[i.workflowId] = (byWorkflow[i.workflowId] ?? 0) + 1;
    }

    return { total: instances.length, byStatus, byWorkflow };
  }

  async getDepartmentActivity() {
    const tasks = await this.db
      .select({
        task: schema.tasks,
        user: {
          id: schema.users.id,
          departmentId: schema.users.departmentId,
        },
      })
      .from(schema.tasks)
      .leftJoin(schema.users, eq(schema.tasks.completedBy, schema.users.id));

    const byDepartment: Record<string, { completed: number; pending: number }> = {};

    for (const { task, user } of tasks) {
      const deptId = task.assignedDepartmentId ?? user?.departmentId ?? 'unassigned';
      if (!byDepartment[deptId]) {
        byDepartment[deptId] = { completed: 0, pending: 0 };
      }
      if (task.status === 'completed') {
        byDepartment[deptId].completed++;
      } else if (task.status === 'pending' || task.status === 'in_progress') {
        byDepartment[deptId].pending++;
      }
    }

    return byDepartment;
  }
}

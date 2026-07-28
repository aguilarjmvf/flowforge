import {
  Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../database/database.module';
import * as schema from '../database/schema';
import { CreateInstanceDto, UpdateInstanceDto, ExecuteTransitionDto } from './dto/workflow-instances.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class WorkflowInstancesService {
  constructor(
    @Inject(DB) private db: NodePgDatabase<typeof schema>,
    private readonly auditLogs: AuditLogsService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── List / Get ────────────────────────────────────────────────────────────────

  async findAll(filters: { workflowId?: string; status?: string; submittedBy?: string }) {
    const rows = await this.db
      .select()
      .from(schema.workflowInstances)
      .orderBy(desc(schema.workflowInstances.createdAt));

    return rows.filter((r) => {
      if (filters.workflowId && r.workflowId !== filters.workflowId) return false;
      if (filters.status && r.status !== filters.status) return false;
      if (filters.submittedBy && r.submittedBy !== filters.submittedBy) return false;
      return true;
    });
  }

  async findOne(id: string) {
    const [instance] = await this.db
      .select()
      .from(schema.workflowInstances)
      .where(eq(schema.workflowInstances.id, id));
    if (!instance) throw new NotFoundException('Workflow instance not found');

    const tasks = await this.db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.workflowInstanceId, id))
      .orderBy(desc(schema.tasks.createdAt));

    return { ...instance, tasks };
  }

  // ── Create ────────────────────────────────────────────────────────────────────

  async create(dto: CreateInstanceDto, userId: string) {
    const workflow = await this.getPublishedWorkflow(dto.workflowId);
    const referenceNumber = await this.generateReferenceNumber(workflow.name);
    const startStep = workflow.steps.find((s) => s.isStart);

    const [instance] = await this.db
      .insert(schema.workflowInstances)
      .values({
        workflowId: dto.workflowId,
        formId: dto.formId,
        referenceNumber,
        title: dto.title,
        formData: dto.formData,
        submittedBy: userId,
        currentStepId: startStep?.id ?? null,
      })
      .returning();

    await this.auditLogs.log({
      userId,
      action: 'instance.created',
      entityType: 'workflow_instance',
      entityId: instance.id,
      metadata: { referenceNumber: instance.referenceNumber, title: instance.title },
    });

    return instance;
  }

  // ── Update (draft only) ───────────────────────────────────────────────────────

  async update(id: string, dto: UpdateInstanceDto) {
    const instance = await this.findOne(id);
    if (instance.status !== 'draft') {
      throw new ForbiddenException('Only draft instances can be edited');
    }
    const [updated] = await this.db
      .update(schema.workflowInstances)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(schema.workflowInstances.id, id))
      .returning();
    return updated;
  }

  // ── Cancel ────────────────────────────────────────────────────────────────────

  async cancel(id: string, userId: string) {
    const instance = await this.findOne(id);
    if (!['draft', 'in_progress'].includes(instance.status)) {
      throw new BadRequestException('Only draft or in-progress instances can be cancelled');
    }
    if (instance.submittedBy !== userId) {
      throw new ForbiddenException('Only the submitter can cancel this request');
    }

    await this.db.update(schema.tasks)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(
        eq(schema.tasks.workflowInstanceId, id),
        eq(schema.tasks.status, 'pending'),
      ));

    const [updated] = await this.db
      .update(schema.workflowInstances)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(schema.workflowInstances.id, id))
      .returning();
    return updated;
  }

  // ── Submit ────────────────────────────────────────────────────────────────────

  async submit(id: string, userId: string) {
    const instance = await this.findOne(id);

    if (instance.status !== 'draft') {
      throw new BadRequestException('Only draft instances can be submitted');
    }
    if (instance.submittedBy !== userId) {
      throw new ForbiddenException('Only the creator can submit this request');
    }

    await this.validateRequiredFields(instance);

    const workflow = await this.getPublishedWorkflow(instance.workflowId);
    const startStep = workflow.steps.find((s) => s.isStart);
    if (!startStep) throw new BadRequestException('Workflow has no start step');

    const submitTransition = workflow.transitions.find(
      (t) => t.fromStepId === startStep.id && t.action === 'submit',
    );
    const nextStep = submitTransition?.toStepId
      ? workflow.steps.find((s) => s.id === submitTransition.toStepId)
      : null;

    const now = new Date();
    const [updated] = await this.db
      .update(schema.workflowInstances)
      .set({
        status: 'in_progress',
        currentStepId: nextStep?.id ?? startStep.id,
        submittedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.workflowInstances.id, id))
      .returning();

    if (nextStep) {
      await this.createTask(id, nextStep, now);
      await this.notifyTaskAssignee(id, nextStep, updated.referenceNumber);
    }

    await this.auditLogs.log({
      userId,
      action: 'instance.submitted',
      entityType: 'workflow_instance',
      entityId: id,
      metadata: { referenceNumber: updated.referenceNumber },
    });

    return updated;
  }

  // ── Execute Transition ────────────────────────────────────────────────────────

  async executeTransition(id: string, dto: ExecuteTransitionDto, userId: string) {
    const instance = await this.findOne(id);

    if (instance.status !== 'in_progress') {
      throw new BadRequestException('Instance is not in progress');
    }

    const activeTask = instance.tasks.find((t) => t.status === 'pending' || t.status === 'in_progress');
    if (!activeTask) throw new BadRequestException('No active task found for this instance');

    await this.assertTaskAuthorized(activeTask, userId);

    const workflow = await this.getPublishedWorkflow(instance.workflowId);
    const currentStep = workflow.steps.find((s) => s.id === instance.currentStepId);
    if (!currentStep) throw new BadRequestException('Current step not found');

    const transition = workflow.transitions.find(
      (t) => t.fromStepId === currentStep.id && t.action === dto.action,
    );
    if (!transition) {
      throw new BadRequestException(`Action "${dto.action}" is not allowed from the current step`);
    }

    const now = new Date();

    // Complete the active task
    await this.db.update(schema.tasks)
      .set({
        status: 'completed',
        actionTaken: dto.action,
        notes: dto.notes ?? null,
        completedAt: now,
        completedBy: userId,
        updatedAt: now,
      })
      .where(eq(schema.tasks.id, activeTask.id));

    // Record approval decision for approve/reject/return actions
    if (dto.action === 'approve' || dto.action === 'reject' || dto.action === 'return') {
      const decisionMap = { approve: 'approved', reject: 'rejected', return: 'returned' } as const;
      await this.db.insert(schema.approvals).values({
        workflowInstanceId: id,
        workflowStepId: currentStep.id,
        taskId: activeTask.id,
        approverId: userId,
        decision: decisionMap[dto.action],
        comments: dto.notes ?? null,
      });
    }

    // Determine new instance state
    if (dto.action === 'reject') {
      await this.db.update(schema.workflowInstances)
        .set({ status: 'rejected', completedAt: now, updatedAt: now })
        .where(eq(schema.workflowInstances.id, id));

      await this.auditLogs.log({ userId, action: 'instance.rejected', entityType: 'workflow_instance', entityId: id });
      await this.notifySubmitter(instance.submittedBy, id, instance.referenceNumber, 'workflow_rejected', 'rejected');

      return this.findOne(id);
    }

    const nextStep = transition.toStepId
      ? workflow.steps.find((s) => s.id === transition.toStepId)
      : null;

    if (!nextStep || nextStep.isEnd) {
      // Workflow complete
      await this.db.update(schema.workflowInstances)
        .set({
          status: 'completed',
          currentStepId: nextStep?.id ?? null,
          completedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.workflowInstances.id, id));

      await this.auditLogs.log({ userId, action: 'instance.completed', entityType: 'workflow_instance', entityId: id });
      await this.notifySubmitter(instance.submittedBy, id, instance.referenceNumber, 'workflow_completed', 'completed');
    } else {
      // Advance to next step
      await this.db.update(schema.workflowInstances)
        .set({ currentStepId: nextStep.id, updatedAt: now })
        .where(eq(schema.workflowInstances.id, id));

      await this.createTask(id, nextStep, now);
      await this.notifyTaskAssignee(id, nextStep, instance.referenceNumber);

      if (dto.action === 'return') {
        await this.notifySubmitter(instance.submittedBy, id, instance.referenceNumber, 'workflow_returned', 'returned for revision');
      } else {
        await this.notifySubmitter(instance.submittedBy, id, instance.referenceNumber, 'workflow_approved', 'approved at this step');
      }

      await this.auditLogs.log({
        userId,
        action: `instance.${dto.action}`,
        entityType: 'workflow_instance',
        entityId: id,
        metadata: { action: dto.action, nextStep: nextStep.name },
      });
    }

    return this.findOne(id);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async getPublishedWorkflow(workflowId: string) {
    const [workflow] = await this.db
      .select()
      .from(schema.workflows)
      .where(eq(schema.workflows.id, workflowId));

    if (!workflow) throw new NotFoundException('Workflow not found');
    if (workflow.status !== 'published') {
      throw new BadRequestException('Workflow is not published');
    }

    const steps = await this.db
      .select()
      .from(schema.workflowSteps)
      .where(eq(schema.workflowSteps.workflowId, workflowId));

    const transitions = await this.db
      .select()
      .from(schema.workflowTransitions)
      .where(eq(schema.workflowTransitions.workflowId, workflowId));

    return { ...workflow, steps, transitions };
  }

  private async createTask(
    instanceId: string,
    step: schema.WorkflowStep,
    now: Date,
  ) {
    const dueDate = step.dueDateDays
      ? new Date(now.getTime() + step.dueDateDays * 86400000)
      : null;

    await this.db.insert(schema.tasks).values({
      workflowInstanceId: instanceId,
      workflowStepId: step.id,
      assignedUserId: step.assignedUserId ?? null,
      assignedRoleId: step.assignedRoleId ?? null,
      assignedDepartmentId: step.assignedDepartmentId ?? null,
      status: 'pending',
      dueDate,
    });
  }

  private async validateRequiredFields(instance: schema.WorkflowInstance) {
    if (!instance.formId) return;

    const fields = await this.db
      .select()
      .from(schema.formFields)
      .where(eq(schema.formFields.formId, instance.formId));

    const formData = (instance.formData ?? {}) as Record<string, unknown>;
    const missing = fields
      .filter((f) => f.isRequired)
      .filter((f) => formData[f.fieldKey] === undefined || formData[f.fieldKey] === null || formData[f.fieldKey] === '');

    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing required fields: ${missing.map((f) => f.label).join(', ')}`,
      );
    }
  }

  private async assertTaskAuthorized(task: schema.Task, userId: string) {
    if (task.assignedUserId && task.assignedUserId !== userId) {
      throw new ForbiddenException('You are not assigned to this task');
    }

    if (task.assignedRoleId) {
      const [userRole] = await this.db
        .select()
        .from(schema.userRoles)
        .where(and(
          eq(schema.userRoles.userId, userId),
          eq(schema.userRoles.roleId, task.assignedRoleId),
        ));
      if (!userRole) throw new ForbiddenException('You do not have the required role for this task');
    }

    if (task.assignedDepartmentId) {
      const [user] = await this.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId));
      if (!user || user.departmentId !== task.assignedDepartmentId) {
        throw new ForbiddenException('You are not in the required department for this task');
      }
    }
  }

  private async generateReferenceNumber(workflowName: string): Promise<string> {
    const prefix = workflowName
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 4);

    const year = new Date().getFullYear();
    const count = await this.db
      .select()
      .from(schema.workflowInstances);

    const seq = String(count.length + 1).padStart(4, '0');
    return `${prefix}-${year}-${seq}`;
  }

  private async notifyTaskAssignee(
    instanceId: string,
    step: schema.WorkflowStep,
    referenceNumber: string,
  ): Promise<void> {
    if (!step.assignedUserId) return;
    await this.notifications.create({
      userId: step.assignedUserId,
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `You have a new task for request ${referenceNumber}: "${step.name}"`,
      entityType: 'workflow_instance',
      entityId: instanceId,
    });
  }

  private async notifySubmitter(
    submittedBy: string,
    instanceId: string,
    referenceNumber: string,
    type: 'workflow_approved' | 'workflow_rejected' | 'workflow_returned' | 'workflow_completed',
    statusLabel: string,
  ): Promise<void> {
    const titleMap = {
      workflow_approved: 'Request Approved',
      workflow_rejected: 'Request Rejected',
      workflow_returned: 'Request Returned',
      workflow_completed: 'Request Completed',
    };
    await this.notifications.create({
      userId: submittedBy,
      type,
      title: titleMap[type],
      message: `Your request ${referenceNumber} has been ${statusLabel}.`,
      entityType: 'workflow_instance',
      entityId: instanceId,
    });
  }
}

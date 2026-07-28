import {
  Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../database/database.module';
import * as schema from '../database/schema';
import {
  CreateWorkflowDto, UpdateWorkflowDto,
  CreateStepDto, UpdateStepDto, ReorderStepsDto,
  CreateTransitionDto, UpdateTransitionDto,
} from './dto/workflows.dto';

@Injectable()
export class WorkflowsService {
  constructor(@Inject(DB) private db: NodePgDatabase<typeof schema>) {}

  // ── Workflows ────────────────────────────────────────────────────────────────

  async findAll(organizationId?: string) {
    const rows = await this.db.select().from(schema.workflows);
    return organizationId ? rows.filter((w) => w.organizationId === organizationId) : rows;
  }

  async findOne(id: string) {
    const [workflow] = await this.db
      .select()
      .from(schema.workflows)
      .where(eq(schema.workflows.id, id));
    if (!workflow) throw new NotFoundException('Workflow not found');

    const steps = await this.db
      .select()
      .from(schema.workflowSteps)
      .where(eq(schema.workflowSteps.workflowId, id));

    const transitions = await this.db
      .select()
      .from(schema.workflowTransitions)
      .where(eq(schema.workflowTransitions.workflowId, id));

    return { ...workflow, steps, transitions };
  }

  async create(dto: CreateWorkflowDto, userId: string) {
    const [workflow] = await this.db
      .insert(schema.workflows)
      .values({ ...dto, createdBy: userId })
      .returning();
    return workflow;
  }

  async update(id: string, dto: UpdateWorkflowDto) {
    const workflow = await this.findOne(id);
    this.assertDraft(workflow);
    const [updated] = await this.db
      .update(schema.workflows)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(schema.workflows.id, id))
      .returning();
    return updated;
  }

  async publish(id: string) {
    const workflow = await this.findOne(id);
    this.assertDraft(workflow);

    const hasStart = workflow.steps.some((s) => s.isStart);
    const hasEnd = workflow.steps.some((s) => s.isEnd);
    if (!hasStart || !hasEnd) {
      throw new BadRequestException('Workflow must have at least one start step and one end step before publishing');
    }

    const [updated] = await this.db
      .update(schema.workflows)
      .set({ status: 'published', updatedAt: new Date() })
      .where(eq(schema.workflows.id, id))
      .returning();
    return updated;
  }

  async archive(id: string) {
    const workflow = await this.findOne(id);
    if (workflow.status === 'archived') throw new BadRequestException('Workflow is already archived');
    const [updated] = await this.db
      .update(schema.workflows)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(schema.workflows.id, id))
      .returning();
    return updated;
  }

  // ── Steps ────────────────────────────────────────────────────────────────────

  async findSteps(workflowId: string) {
    await this.findOne(workflowId);
    return this.db
      .select()
      .from(schema.workflowSteps)
      .where(eq(schema.workflowSteps.workflowId, workflowId));
  }

  async createStep(workflowId: string, dto: CreateStepDto) {
    const workflow = await this.findOne(workflowId);
    this.assertDraft(workflow);
    const [step] = await this.db
      .insert(schema.workflowSteps)
      .values({ ...dto, workflowId })
      .returning();
    return step;
  }

  async updateStep(workflowId: string, stepId: string, dto: UpdateStepDto) {
    const workflow = await this.findOne(workflowId);
    this.assertDraft(workflow);
    await this.findStep(workflowId, stepId);
    const [updated] = await this.db
      .update(schema.workflowSteps)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(schema.workflowSteps.id, stepId))
      .returning();
    return updated;
  }

  async deleteStep(workflowId: string, stepId: string) {
    const workflow = await this.findOne(workflowId);
    this.assertDraft(workflow);
    await this.findStep(workflowId, stepId);
    await this.db
      .delete(schema.workflowTransitions)
      .where(eq(schema.workflowTransitions.fromStepId, stepId));
    await this.db
      .delete(schema.workflowTransitions)
      .where(eq(schema.workflowTransitions.toStepId, stepId));
    await this.db
      .delete(schema.workflowSteps)
      .where(eq(schema.workflowSteps.id, stepId));
  }

  async reorderSteps(workflowId: string, dto: ReorderStepsDto) {
    const workflow = await this.findOne(workflowId);
    this.assertDraft(workflow);
    for (const { id, order } of dto.steps) {
      await this.db
        .update(schema.workflowSteps)
        .set({ order, updatedAt: new Date() })
        .where(and(eq(schema.workflowSteps.id, id), eq(schema.workflowSteps.workflowId, workflowId)));
    }
  }

  // ── Transitions ───────────────────────────────────────────────────────────────

  async findTransitions(workflowId: string) {
    await this.findOne(workflowId);
    return this.db
      .select()
      .from(schema.workflowTransitions)
      .where(eq(schema.workflowTransitions.workflowId, workflowId));
  }

  async createTransition(workflowId: string, dto: CreateTransitionDto) {
    const workflow = await this.findOne(workflowId);
    this.assertDraft(workflow);
    await this.findStep(workflowId, dto.fromStepId);
    if (dto.toStepId) await this.findStep(workflowId, dto.toStepId);
    const [transition] = await this.db
      .insert(schema.workflowTransitions)
      .values({ ...dto, workflowId })
      .returning();
    return transition;
  }

  async updateTransition(workflowId: string, transitionId: string, dto: UpdateTransitionDto) {
    const workflow = await this.findOne(workflowId);
    this.assertDraft(workflow);
    await this.findTransition(workflowId, transitionId);
    if (dto.fromStepId) await this.findStep(workflowId, dto.fromStepId);
    if (dto.toStepId) await this.findStep(workflowId, dto.toStepId);
    const [updated] = await this.db
      .update(schema.workflowTransitions)
      .set(dto)
      .where(eq(schema.workflowTransitions.id, transitionId))
      .returning();
    return updated;
  }

  async deleteTransition(workflowId: string, transitionId: string) {
    const workflow = await this.findOne(workflowId);
    this.assertDraft(workflow);
    await this.findTransition(workflowId, transitionId);
    await this.db
      .delete(schema.workflowTransitions)
      .where(eq(schema.workflowTransitions.id, transitionId));
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private assertDraft(workflow: { status: string }) {
    if (workflow.status !== 'draft') {
      throw new ForbiddenException('Only draft workflows can be modified');
    }
  }

  private async findStep(workflowId: string, stepId: string) {
    const [step] = await this.db
      .select()
      .from(schema.workflowSteps)
      .where(and(eq(schema.workflowSteps.id, stepId), eq(schema.workflowSteps.workflowId, workflowId)));
    if (!step) throw new NotFoundException('Step not found in this workflow');
    return step;
  }

  private async findTransition(workflowId: string, transitionId: string) {
    const [t] = await this.db
      .select()
      .from(schema.workflowTransitions)
      .where(and(eq(schema.workflowTransitions.id, transitionId), eq(schema.workflowTransitions.workflowId, workflowId)));
    if (!t) throw new NotFoundException('Transition not found in this workflow');
    return t;
  }
}

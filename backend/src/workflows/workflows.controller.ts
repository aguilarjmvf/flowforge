import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  CreateWorkflowSchema, CreateWorkflowDto,
  UpdateWorkflowSchema, UpdateWorkflowDto,
  CreateStepSchema, CreateStepDto,
  UpdateStepSchema, UpdateStepDto,
  ReorderStepsSchema, ReorderStepsDto,
  CreateTransitionSchema, CreateTransitionDto,
  UpdateTransitionSchema, UpdateTransitionDto,
} from './dto/workflows.dto';
import { ok } from '../common/types/api-response';

@ApiTags('Workflows')
@ApiBearerAuth()
@Controller('workflows')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WorkflowsController {
  constructor(private workflowsService: WorkflowsService) {}

  // ── Workflows ────────────────────────────────────────────────────────────────

  @Get()
  @RequirePermissions('workflows.view')
  async findAll(@Query('organizationId') organizationId?: string) {
    return ok(await this.workflowsService.findAll(organizationId));
  }

  @Get(':id')
  @RequirePermissions('workflows.view')
  async findOne(@Param('id') id: string) {
    return ok(await this.workflowsService.findOne(id));
  }

  @Post()
  @RequirePermissions('workflows.create')
  async create(
    @Body(new ZodValidationPipe(CreateWorkflowSchema)) body: CreateWorkflowDto,
    @CurrentUser() user: any,
  ) {
    return ok(await this.workflowsService.create(body, user.id));
  }

  @Patch(':id')
  @RequirePermissions('workflows.update')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateWorkflowSchema)) body: UpdateWorkflowDto,
  ) {
    return ok(await this.workflowsService.update(id, body));
  }

  @Post(':id/publish')
  @HttpCode(200)
  @RequirePermissions('workflows.publish')
  async publish(@Param('id') id: string) {
    return ok(await this.workflowsService.publish(id));
  }

  @Post(':id/archive')
  @HttpCode(200)
  @RequirePermissions('workflows.update')
  async archive(@Param('id') id: string) {
    return ok(await this.workflowsService.archive(id));
  }

  // ── Steps ────────────────────────────────────────────────────────────────────

  @Get(':id/steps')
  @RequirePermissions('workflows.view')
  async findSteps(@Param('id') id: string) {
    return ok(await this.workflowsService.findSteps(id));
  }

  @Post(':id/steps')
  @RequirePermissions('workflows.update')
  async createStep(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateStepSchema)) body: CreateStepDto,
  ) {
    return ok(await this.workflowsService.createStep(id, body));
  }

  @Patch(':id/steps/reorder')
  @RequirePermissions('workflows.update')
  async reorderSteps(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ReorderStepsSchema)) body: ReorderStepsDto,
  ) {
    await this.workflowsService.reorderSteps(id, body);
    return ok(null);
  }

  @Patch(':id/steps/:stepId')
  @RequirePermissions('workflows.update')
  async updateStep(
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body(new ZodValidationPipe(UpdateStepSchema)) body: UpdateStepDto,
  ) {
    return ok(await this.workflowsService.updateStep(id, stepId, body));
  }

  @Delete(':id/steps/:stepId')
  @HttpCode(200)
  @RequirePermissions('workflows.update')
  async deleteStep(@Param('id') id: string, @Param('stepId') stepId: string) {
    await this.workflowsService.deleteStep(id, stepId);
    return ok(null);
  }

  // ── Transitions ───────────────────────────────────────────────────────────────

  @Get(':id/transitions')
  @RequirePermissions('workflows.view')
  async findTransitions(@Param('id') id: string) {
    return ok(await this.workflowsService.findTransitions(id));
  }

  @Post(':id/transitions')
  @RequirePermissions('workflows.update')
  async createTransition(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateTransitionSchema)) body: CreateTransitionDto,
  ) {
    return ok(await this.workflowsService.createTransition(id, body));
  }

  @Patch(':id/transitions/:transitionId')
  @RequirePermissions('workflows.update')
  async updateTransition(
    @Param('id') id: string,
    @Param('transitionId') transitionId: string,
    @Body(new ZodValidationPipe(UpdateTransitionSchema)) body: UpdateTransitionDto,
  ) {
    return ok(await this.workflowsService.updateTransition(id, transitionId, body));
  }

  @Delete(':id/transitions/:transitionId')
  @HttpCode(200)
  @RequirePermissions('workflows.update')
  async deleteTransition(@Param('id') id: string, @Param('transitionId') transitionId: string) {
    await this.workflowsService.deleteTransition(id, transitionId);
    return ok(null);
  }
}

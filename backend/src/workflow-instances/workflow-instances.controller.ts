import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiQuery } from '@nestjs/swagger';
import { WorkflowInstancesService } from './workflow-instances.service';
import {
  CreateInstanceSchema,
  UpdateInstanceSchema,
  ExecuteTransitionSchema,
  CreateInstanceDto,
  UpdateInstanceDto,
  ExecuteTransitionDto,
} from './dto/workflow-instances.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ok } from '../common/types/api-response';

@ApiTags('Workflow Instances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('instances')
export class WorkflowInstancesController {
  constructor(private readonly service: WorkflowInstancesService) {}

  @Get()
  @RequirePermissions('instances.view')
  @ApiOperation({ summary: 'List workflow instances' })
  @ApiQuery({ name: 'workflowId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'mine', required: false, type: Boolean })
  async findAll(
    @Query('workflowId') workflowId?: string,
    @Query('status') status?: string,
    @Query('mine') mine?: string,
    @CurrentUser() user?: any,
  ) {
    const submittedBy = mine === 'true' ? user.id : undefined;
    const data = await this.service.findAll({ workflowId, status, submittedBy });
    return ok(data);
  }

  @Get(':id')
  @RequirePermissions('instances.view')
  @ApiOperation({ summary: 'Get a workflow instance' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.service.findOne(id);
    return ok(data);
  }

  @Post()
  @RequirePermissions('instances.create')
  @ApiOperation({ summary: 'Create a new workflow instance (draft)' })
  @ApiBody({
    schema: {
      properties: {
        workflowId: { type: 'string', format: 'uuid' },
        formId: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        formData: { type: 'object' },
      },
      required: ['workflowId', 'title'],
    },
  })
  async create(
    @Body(new ZodValidationPipe(CreateInstanceSchema)) dto: CreateInstanceDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.create(dto, user.id);
    return ok(data);
  }

  @Patch(':id')
  @RequirePermissions('instances.update')
  @ApiOperation({ summary: 'Update a draft instance' })
  @ApiBody({
    schema: {
      properties: {
        title: { type: 'string' },
        formData: { type: 'object' },
      },
    },
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateInstanceSchema)) dto: UpdateInstanceDto,
  ) {
    const data = await this.service.update(id, dto);
    return ok(data);
  }

  @Post(':id/submit')
  @RequirePermissions('instances.submit')
  @ApiOperation({ summary: 'Submit a draft instance to start the workflow' })
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.submit(id, user.id);
    return ok(data);
  }

  @Post(':id/transition')
  @RequirePermissions('instances.transition')
  @ApiOperation({ summary: 'Execute a workflow transition (approve / reject / return)' })
  @ApiBody({
    schema: {
      properties: {
        action: { type: 'string', enum: ['submit', 'approve', 'reject', 'return'] },
        notes: { type: 'string' },
      },
      required: ['action'],
    },
  })
  async executeTransition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(ExecuteTransitionSchema)) dto: ExecuteTransitionDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.executeTransition(id, dto, user.id);
    return ok(data);
  }

  @Delete(':id/cancel')
  @RequirePermissions('instances.cancel')
  @ApiOperation({ summary: 'Cancel a workflow instance' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.cancel(id, user.id);
    return ok(data);
  }
}

import { Controller, Get, Patch, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ok } from '../common/types/api-response';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Get('my')
  @RequirePermissions('tasks.view')
  @ApiOperation({ summary: 'Get tasks assigned to the current user (inbox)' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'in_progress', 'completed', 'cancelled'] })
  async myTasks(
    @CurrentUser() user: any,
    @Query('status') status?: string,
  ) {
    const data = await this.service.findMyTasks(user.id, status);
    return ok(data);
  }

  @Get(':id')
  @RequirePermissions('tasks.view')
  @ApiOperation({ summary: 'Get a task by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.service.findOne(id);
    return ok(data);
  }

  @Patch(':id/start')
  @RequirePermissions('tasks.view')
  @ApiOperation({ summary: 'Mark a task as in-progress (claim it)' })
  async startTask(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.startTask(id, user.id);
    return ok(data);
  }
}

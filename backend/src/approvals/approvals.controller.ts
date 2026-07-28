import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ApprovalsService } from './approvals.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ok } from '../common/types/api-response';

@ApiTags('Approvals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly service: ApprovalsService) {}

  @Get()
  @RequirePermissions('approvals.view')
  @ApiOperation({ summary: 'List approval records' })
  @ApiQuery({ name: 'instanceId', required: false })
  @ApiQuery({ name: 'decision', required: false, enum: ['approved', 'rejected', 'returned'] })
  @ApiQuery({ name: 'mine', required: false, type: Boolean })
  async findAll(
    @Query('instanceId') instanceId?: string,
    @Query('decision') decision?: string,
    @Query('mine') mine?: string,
    @CurrentUser() user?: any,
  ) {
    const approverId = mine === 'true' ? user.id : undefined;
    const data = await this.service.findAll({ instanceId, approverId, decision });
    return ok(data);
  }

  @Get('instance/:instanceId')
  @RequirePermissions('approvals.view')
  @ApiOperation({ summary: 'Get approval history for a workflow instance' })
  async findByInstance(@Param('instanceId', ParseUUIDPipe) instanceId: string) {
    const data = await this.service.findByInstance(instanceId);
    return ok(data);
  }
}

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { ok } from '../common/types/api-response';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('dashboard')
  @RequirePermissions('reports.view')
  @ApiOperation({ summary: 'Get dashboard metrics' })
  async dashboard() {
    const data = await this.service.getDashboard();
    return ok(data);
  }

  @Get('instances')
  @RequirePermissions('reports.view')
  @ApiOperation({ summary: 'Get workflow instance summary' })
  async instanceSummary() {
    const data = await this.service.getInstanceSummary();
    return ok(data);
  }

  @Get('departments')
  @RequirePermissions('reports.view')
  @ApiOperation({ summary: 'Get department activity report' })
  async departmentActivity() {
    const data = await this.service.getDepartmentActivity();
    return ok(data);
  }
}

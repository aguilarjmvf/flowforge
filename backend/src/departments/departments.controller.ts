import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode,
} from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  CreateDepartmentSchema, CreateDepartmentDto,
  UpdateDepartmentSchema, UpdateDepartmentDto,
} from './dto/departments.dto';
import { ok } from '../common/types/api-response';

@Controller('departments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DepartmentsController {
  constructor(private deptService: DepartmentsService) {}

  @Get()
  @RequirePermissions('departments.view')
  async findAll(@Query('organizationId') organizationId?: string) {
    return ok(await this.deptService.findAll(organizationId));
  }

  @Get(':id')
  @RequirePermissions('departments.view')
  async findOne(@Param('id') id: string) {
    return ok(await this.deptService.findOne(id));
  }

  @Post()
  @RequirePermissions('departments.create')
  async create(@Body(new ZodValidationPipe(CreateDepartmentSchema)) body: CreateDepartmentDto) {
    return ok(await this.deptService.create(body));
  }

  @Patch(':id')
  @RequirePermissions('departments.update')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateDepartmentSchema)) body: UpdateDepartmentDto,
  ) {
    return ok(await this.deptService.update(id, body));
  }

  @Delete(':id')
  @HttpCode(200)
  @RequirePermissions('departments.delete')
  async deactivate(@Param('id') id: string) {
    await this.deptService.deactivate(id);
    return ok(null);
  }
}

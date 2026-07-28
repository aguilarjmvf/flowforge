import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  CreateRoleSchema, CreateRoleDto,
  UpdateRoleSchema, UpdateRoleDto,
  AssignPermissionsSchema, AssignPermissionsDto,
} from './dto/roles.dto';
import { ok } from '../common/types/api-response';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get()
  @RequirePermissions('roles.view')
  async findAll(@Query('organizationId') organizationId?: string) {
    return ok(await this.rolesService.findAll(organizationId));
  }

  @Get(':id')
  @RequirePermissions('roles.view')
  async findOne(@Param('id') id: string) {
    return ok(await this.rolesService.findOne(id));
  }

  @Get(':id/permissions')
  @RequirePermissions('roles.view')
  async getPermissions(@Param('id') id: string) {
    return ok(await this.rolesService.getPermissions(id));
  }

  @Post()
  @RequirePermissions('roles.create')
  async create(@Body(new ZodValidationPipe(CreateRoleSchema)) body: CreateRoleDto) {
    return ok(await this.rolesService.create(body));
  }

  @Patch(':id')
  @RequirePermissions('roles.update')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateRoleSchema)) body: UpdateRoleDto,
  ) {
    return ok(await this.rolesService.update(id, body));
  }

  @Delete(':id')
  @HttpCode(200)
  @RequirePermissions('roles.delete')
  async delete(@Param('id') id: string) {
    await this.rolesService.delete(id);
    return ok(null);
  }

  @Post(':id/permissions')
  @RequirePermissions('roles.update')
  async assignPermissions(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AssignPermissionsSchema)) body: AssignPermissionsDto,
  ) {
    await this.rolesService.assignPermissions(id, body.permissionIds);
    return ok(null);
  }
}

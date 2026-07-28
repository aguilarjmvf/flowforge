import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  CreateOrganizationSchema, CreateOrganizationDto,
  UpdateOrganizationSchema, UpdateOrganizationDto,
} from './dto/organizations.dto';
import { ok } from '../common/types/api-response';

@Controller('organizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrganizationsController {
  constructor(private orgsService: OrganizationsService) {}

  @Get()
  @RequirePermissions('organizations.view')
  async findAll() {
    return ok(await this.orgsService.findAll());
  }

  @Get(':id')
  @RequirePermissions('organizations.view')
  async findOne(@Param('id') id: string) {
    return ok(await this.orgsService.findOne(id));
  }

  @Post()
  @RequirePermissions('organizations.create')
  async create(@Body(new ZodValidationPipe(CreateOrganizationSchema)) body: CreateOrganizationDto) {
    return ok(await this.orgsService.create(body));
  }

  @Patch(':id')
  @RequirePermissions('organizations.update')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateOrganizationSchema)) body: UpdateOrganizationDto,
  ) {
    return ok(await this.orgsService.update(id, body));
  }
}

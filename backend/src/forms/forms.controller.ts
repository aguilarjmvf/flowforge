import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FormsService } from './forms.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  CreateFormSchema, CreateFormDto,
  UpdateFormSchema, UpdateFormDto,
  CreateFieldSchema, CreateFieldDto,
  UpdateFieldSchema, UpdateFieldDto,
  ReorderFieldsSchema, ReorderFieldsDto,
} from './dto/forms.dto';
import { ok } from '../common/types/api-response';

@ApiTags('Forms')
@ApiBearerAuth()
@Controller('forms')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FormsController {
  constructor(private formsService: FormsService) {}

  // ── Forms ─────────────────────────────────────────────────────────────────────

  @Get()
  @RequirePermissions('forms.view')
  async findAll(@Query('workflowId') workflowId?: string) {
    return ok(await this.formsService.findAll(workflowId));
  }

  @Get(':id')
  @RequirePermissions('forms.view')
  async findOne(@Param('id') id: string) {
    return ok(await this.formsService.findOne(id));
  }

  @Post()
  @RequirePermissions('forms.create')
  async create(
    @Body(new ZodValidationPipe(CreateFormSchema)) body: CreateFormDto,
    @CurrentUser() user: any,
  ) {
    return ok(await this.formsService.create(body, user.id));
  }

  @Patch(':id')
  @RequirePermissions('forms.update')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateFormSchema)) body: UpdateFormDto,
  ) {
    return ok(await this.formsService.update(id, body));
  }

  @Delete(':id')
  @HttpCode(200)
  @RequirePermissions('forms.delete')
  async delete(@Param('id') id: string) {
    await this.formsService.delete(id);
    return ok(null);
  }

  // ── Fields ────────────────────────────────────────────────────────────────────

  @Post(':id/fields')
  @RequirePermissions('forms.update')
  async createField(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateFieldSchema)) body: CreateFieldDto,
  ) {
    return ok(await this.formsService.createField(id, body));
  }

  @Patch(':id/fields/reorder')
  @RequirePermissions('forms.update')
  async reorderFields(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ReorderFieldsSchema)) body: ReorderFieldsDto,
  ) {
    await this.formsService.reorderFields(id, body);
    return ok(null);
  }

  @Patch(':id/fields/:fieldId')
  @RequirePermissions('forms.update')
  async updateField(
    @Param('id') id: string,
    @Param('fieldId') fieldId: string,
    @Body(new ZodValidationPipe(UpdateFieldSchema)) body: UpdateFieldDto,
  ) {
    return ok(await this.formsService.updateField(id, fieldId, body));
  }

  @Delete(':id/fields/:fieldId')
  @HttpCode(200)
  @RequirePermissions('forms.update')
  async deleteField(@Param('id') id: string, @Param('fieldId') fieldId: string) {
    await this.formsService.deleteField(id, fieldId);
    return ok(null);
  }
}

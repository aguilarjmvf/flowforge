import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, UsePipes, HttpCode,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CreateUserSchema, CreateUserDto, UpdateUserSchema, UpdateUserDto } from './dto/users.dto';
import { z } from 'zod';
import { ok } from '../common/types/api-response';

const AssignRolesSchema = z.object({ roleIds: z.array(z.string().uuid()) });

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @RequirePermissions('users.view')
  async findAll() {
    return ok(await this.usersService.findAll());
  }

  @Get(':id')
  @RequirePermissions('users.view')
  async findOne(@Param('id') id: string) {
    return ok(await this.usersService.findOne(id));
  }

  @Post()
  @RequirePermissions('users.create')
  @UsePipes(new ZodValidationPipe(CreateUserSchema))
  async create(@Body() body: CreateUserDto) {
    return ok(await this.usersService.create(body));
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateUserSchema)) body: UpdateUserDto,
  ) {
    return ok(await this.usersService.update(id, body));
  }

  @Delete(':id')
  @HttpCode(200)
  @RequirePermissions('users.delete')
  async deactivate(@Param('id') id: string) {
    await this.usersService.deactivate(id);
    return ok(null);
  }

  @Post(':id/roles')
  @RequirePermissions('users.update')
  async assignRoles(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AssignRolesSchema)) body: { roleIds: string[] },
    @CurrentUser() user: any,
  ) {
    await this.usersService.assignRoles(id, body.roleIds, user.id);
    return ok(null);
  }
}

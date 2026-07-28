import { Controller, Get, Patch, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ok } from '../common/types/api-response';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get my notifications' })
  @ApiQuery({ name: 'unread', required: false, type: Boolean })
  async findMine(
    @CurrentUser() user: any,
    @Query('unread') unread?: string,
  ) {
    const data = await this.service.findMyNotifications(user.id, unread === 'true');
    return ok(data);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count (badge)' })
  async unreadCount(@CurrentUser() user: any) {
    const count = await this.service.countUnread(user.id);
    return ok({ count });
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    await this.service.markRead(id, user.id);
    return ok(null);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser() user: any) {
    await this.service.markAllRead(user.id);
    return ok(null);
  }
}

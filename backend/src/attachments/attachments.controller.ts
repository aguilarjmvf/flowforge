import {
  Controller, Get, Post, Delete, Param, Res, UseGuards, ParseUUIDPipe,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ok } from '../common/types/api-response';

@ApiTags('Attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  @Get('instance/:instanceId')
  @RequirePermissions('attachments.view')
  @ApiOperation({ summary: 'List attachments for a workflow instance' })
  async findByInstance(@Param('instanceId', ParseUUIDPipe) instanceId: string) {
    const data = await this.service.findByInstance(instanceId);
    return ok(data);
  }

  @Post('instance/:instanceId')
  @RequirePermissions('attachments.upload')
  @ApiOperation({ summary: 'Upload a file to a workflow instance' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: undefined }))
  async upload(
    @Param('instanceId', ParseUUIDPipe) instanceId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.upload(instanceId, user.id, file);
    return ok(data);
  }

  @Get(':id/download')
  @RequirePermissions('attachments.view')
  @ApiOperation({ summary: 'Download an attachment' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const { attachment, filePath } = await this.service.getFileForDownload(id, user.id);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
    res.setHeader('Content-Type', attachment.mimeType);
    res.sendFile(filePath);
  }

  @Delete(':id')
  @RequirePermissions('attachments.delete')
  @ApiOperation({ summary: 'Delete an attachment' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.delete(id, user.id);
    return ok(data);
  }
}

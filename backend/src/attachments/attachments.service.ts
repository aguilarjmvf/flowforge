import {
  Injectable, Inject, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../database/database.module';
import * as schema from '../database/schema';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

@Injectable()
export class AttachmentsService {
  constructor(@Inject(DB) private db: NodePgDatabase<typeof schema>) {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  }

  async upload(
    instanceId: string,
    userId: string,
    file: Express.Multer.File,
  ) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(`File type "${file.mimetype}" is not allowed`);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File exceeds the 10 MB size limit');
    }

    const [instance] = await this.db
      .select()
      .from(schema.workflowInstances)
      .where(eq(schema.workflowInstances.id, instanceId));
    if (!instance) throw new NotFoundException('Workflow instance not found');

    const ext = path.extname(file.originalname).toLowerCase();
    const storageName = `${randomUUID()}${ext}`;
    const destPath = path.join(UPLOADS_DIR, storageName);

    fs.writeFileSync(destPath, file.buffer);

    const [attachment] = await this.db
      .insert(schema.attachments)
      .values({
        workflowInstanceId: instanceId,
        uploadedBy: userId,
        originalName: file.originalname,
        storageName,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      })
      .returning();

    return attachment;
  }

  async findByInstance(instanceId: string) {
    return this.db
      .select()
      .from(schema.attachments)
      .where(eq(schema.attachments.workflowInstanceId, instanceId));
  }

  async getFileForDownload(attachmentId: string, userId: string) {
    const [attachment] = await this.db
      .select()
      .from(schema.attachments)
      .where(eq(schema.attachments.id, attachmentId));

    if (!attachment) throw new NotFoundException('Attachment not found');

    // Verify the user has access to the instance (is submitter or completed a task on it)
    const [instance] = await this.db
      .select()
      .from(schema.workflowInstances)
      .where(eq(schema.workflowInstances.id, attachment.workflowInstanceId));

    if (!instance) throw new NotFoundException('Instance not found');

    const userTasks = await this.db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.workflowInstanceId, attachment.workflowInstanceId));

    const hasAccess =
      instance.submittedBy === userId ||
      userTasks.some((t) => t.assignedUserId === userId || t.completedBy === userId);

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this attachment');
    }

    const filePath = path.join(UPLOADS_DIR, attachment.storageName);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found on disk');
    }

    return { attachment, filePath };
  }

  async delete(attachmentId: string, userId: string) {
    const [attachment] = await this.db
      .select()
      .from(schema.attachments)
      .where(eq(schema.attachments.id, attachmentId));

    if (!attachment) throw new NotFoundException('Attachment not found');
    if (attachment.uploadedBy !== userId) {
      throw new ForbiddenException('You can only delete your own attachments');
    }

    const filePath = path.join(UPLOADS_DIR, attachment.storageName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await this.db.delete(schema.attachments).where(eq(schema.attachments.id, attachmentId));
    return { deleted: true };
  }
}

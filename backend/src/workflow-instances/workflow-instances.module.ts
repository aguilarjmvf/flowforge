import { Module } from '@nestjs/common';
import { WorkflowInstancesController } from './workflow-instances.controller';
import { WorkflowInstancesService } from './workflow-instances.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [AuditLogsModule, NotificationsModule, MailModule],
  controllers: [WorkflowInstancesController],
  providers: [WorkflowInstancesService],
  exports: [WorkflowInstancesService],
})
export class WorkflowInstancesModule {}

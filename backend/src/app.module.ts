import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { DepartmentsModule } from './departments/departments.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { FormsModule } from './forms/forms.module';
import { WorkflowInstancesModule } from './workflow-instances/workflow-instances.module';
import { TasksModule } from './tasks/tasks.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    DepartmentsModule,
    RolesModule,
    PermissionsModule,
    WorkflowsModule,
    FormsModule,
    WorkflowInstancesModule,
    TasksModule,
    ApprovalsModule,
    NotificationsModule,
    AttachmentsModule,
    AuditLogsModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

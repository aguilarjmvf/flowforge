export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isSuperAdmin: boolean;
  organizationId: string | null;
  departmentId: string | null;
  permissions: string[];
}

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
}

export interface WorkflowInstance {
  id: string;
  workflowId: string;
  formId: string | null;
  referenceNumber: string;
  title: string;
  status: 'draft' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  currentStepId: string | null;
  formData: Record<string, unknown>;
  submittedBy: string;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  tasks?: Task[];
}

export interface Task {
  id: string;
  workflowInstanceId: string;
  workflowStepId: string;
  assignedUserId: string | null;
  assignedRoleId: string | null;
  assignedDepartmentId: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  dueDate: string | null;
  completedAt: string | null;
  actionTaken: string | null;
  notes: string | null;
  completedBy: string | null;
  createdAt: string;
}

export interface TaskWithContext {
  task: Task;
  instance: WorkflowInstance | null;
  step: { id: string; name: string } | null;
}

export interface Approval {
  approval: {
    id: string;
    workflowInstanceId: string;
    workflowStepId: string;
    taskId: string;
    approverId: string;
    decision: 'approved' | 'rejected' | 'returned';
    comments: string | null;
    createdAt: string;
  };
  approver: { id: string; firstName: string; lastName: string; email: string } | null;
  step: { id: string; name: string } | null;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
}

export interface DashboardMetrics {
  instances: {
    active: number;
    draft: number;
    completed: number;
    rejected: number;
    total: number;
  };
  tasks: { pending: number; total: number };
  workflows: { published: number; total: number };
  avgCompletionHours: number | null;
}

export interface Form {
  id: string;
  name: string;
  workflowId: string | null;
  fields?: FormField[];
}

export interface FormField {
  id: string;
  formId: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  isRequired: boolean;
  defaultValue: string | null;
  displayOrder: number;
  options: unknown;
  validationRules: unknown;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  organizationId: string;
  parentDepartmentId: string | null;
  createdAt: string;
}

export interface WorkflowStep {
  id: string;
  workflowId: string;
  name: string;
  stepOrder: number;
  approvalType: string;
  assignedRoleId: string | null;
  assignedDepartmentId: string | null;
  assignedUserId: string | null;
}

export interface WorkflowWithSteps extends Workflow {
  steps?: WorkflowStep[];
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string; email: string } | null;
}

export interface UserDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  organizationId: string | null;
  departmentId: string | null;
  createdAt: string;
}

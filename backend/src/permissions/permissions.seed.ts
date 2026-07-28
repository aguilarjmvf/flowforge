export const PERMISSION_DEFINITIONS = [
  // Users
  { name: 'users.view', module: 'users', description: 'View users' },
  { name: 'users.create', module: 'users', description: 'Create users' },
  { name: 'users.update', module: 'users', description: 'Update users' },
  { name: 'users.delete', module: 'users', description: 'Deactivate users' },
  // Organizations
  { name: 'organizations.view', module: 'organizations', description: 'View organizations' },
  { name: 'organizations.create', module: 'organizations', description: 'Create organizations' },
  { name: 'organizations.update', module: 'organizations', description: 'Update organizations' },
  // Departments
  { name: 'departments.view', module: 'departments', description: 'View departments' },
  { name: 'departments.create', module: 'departments', description: 'Create departments' },
  { name: 'departments.update', module: 'departments', description: 'Update departments' },
  { name: 'departments.delete', module: 'departments', description: 'Deactivate departments' },
  // Roles
  { name: 'roles.view', module: 'roles', description: 'View roles' },
  { name: 'roles.create', module: 'roles', description: 'Create roles' },
  { name: 'roles.update', module: 'roles', description: 'Update roles and assign permissions' },
  { name: 'roles.delete', module: 'roles', description: 'Delete roles' },
  // Permissions
  { name: 'permissions.view', module: 'permissions', description: 'View permissions' },
  // Workflows
  { name: 'workflows.view', module: 'workflows', description: 'View workflows' },
  { name: 'workflows.create', module: 'workflows', description: 'Create workflows' },
  { name: 'workflows.update', module: 'workflows', description: 'Update workflows' },
  { name: 'workflows.delete', module: 'workflows', description: 'Delete workflows' },
  { name: 'workflows.publish', module: 'workflows', description: 'Publish workflows' },
  // Forms
  { name: 'forms.view', module: 'forms', description: 'View forms' },
  { name: 'forms.create', module: 'forms', description: 'Create forms' },
  { name: 'forms.update', module: 'forms', description: 'Update forms and manage fields' },
  { name: 'forms.delete', module: 'forms', description: 'Delete forms' },
  // Workflow Instances
  { name: 'instances.view', module: 'workflow-instances', description: 'View workflow instances' },
  { name: 'instances.create', module: 'workflow-instances', description: 'Create workflow instances' },
  { name: 'instances.update', module: 'workflow-instances', description: 'Update draft instances' },
  { name: 'instances.submit', module: 'workflow-instances', description: 'Submit instances to start workflow' },
  { name: 'instances.transition', module: 'workflow-instances', description: 'Execute workflow transitions (approve/reject/return)' },
  { name: 'instances.cancel', module: 'workflow-instances', description: 'Cancel workflow instances' },
  // Tasks
  { name: 'tasks.view', module: 'tasks', description: 'View assigned tasks' },
  { name: 'tasks.complete', module: 'tasks', description: 'Complete tasks' },
  // Approvals
  { name: 'approvals.view', module: 'approvals', description: 'View approval history' },
  { name: 'approvals.approve', module: 'approvals', description: 'Approve requests' },
  { name: 'approvals.reject', module: 'approvals', description: 'Reject requests' },
  { name: 'approvals.return', module: 'approvals', description: 'Return requests for revision' },
  // Attachments
  { name: 'attachments.view', module: 'attachments', description: 'View attachments' },
  { name: 'attachments.upload', module: 'attachments', description: 'Upload attachments' },
  { name: 'attachments.delete', module: 'attachments', description: 'Delete attachments' },
  // Reports & Audit
  { name: 'reports.view', module: 'reports', description: 'View reports and dashboard' },
  { name: 'audit-logs.view', module: 'audit-logs', description: 'View audit logs' },
];

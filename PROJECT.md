# PROJECT.md — FlowForge

## 1. Product

**FlowForge** is a configurable enterprise workflow automation platform.

It allows organizations to digitize business processes using reusable:

```text
Forms
→ Workflow Steps
→ Assignment Rules
→ Approvals
→ Notifications
→ Audit Trails
```

The same workflow engine should support different processes without building a separate application for each one.

---

## 2. Example Processes

* Purchase Requests
* Leave Requests
* IT Service Requests
* Travel Requests
* Document Routing
* Procurement Requests
* Financial Requests
* General Approval Requests

Example:

```text
Requester
  ↓
Supervisor Review
  ↓
Budget Review
  ↓
Final Approval
  ↓
Completed
```

---

## 3. Core Concepts

### Workflow Definition

Reusable process template.

Example:

```text
Purchase Request Workflow
```

### Workflow Instance

An actual request created from a workflow.

Example:

```text
Purchase Request #PR-2026-0001
```

### Workflow Step

A stage in the process.

Example:

```text
Supervisor Review
```

### Task

An action assigned to a user, role, or department.

### Approval

A recorded decision:

```text
Approve
Reject
Return for Revision
```

---

## 4. Users and Organization

Supported organizational structure:

```text
Organization
    ↓
Departments
    ↓
Users
    ↓
Roles
    ↓
Permissions
```

Initial user types:

* System Administrator
* Organization Administrator
* Workflow Designer
* Requester
* Reviewer
* Approver
* Viewer

Use permission-based authorization.

---

## 5. Core Modules

```text
1. Authentication
2. Users
3. Organizations
4. Departments
5. Roles
6. Permissions
7. Workflows
8. Forms
9. Workflow Instances
10. Tasks
11. Approvals
12. Notifications
13. Attachments
14. Audit Logs
15. Dashboard
16. Reports
```

---

## 6. Workflow Definition

A workflow may contain:

* Name
* Description
* Status
* Version
* Form configuration
* Steps
* Transitions
* Assignment rules
* Approval rules

Workflow statuses:

```text
draft
published
archived
```

Workflow steps may define:

* Name
* Description
* Step type
* Assigned user
* Assigned role
* Assigned department
* Actions
* Transitions
* Due date

---

## 7. Dynamic Forms

Forms must support configurable fields.

Initial field types:

```text
Text
Long Text
Number
Currency
Date
Date/Time
Dropdown
Radio
Checkbox
File Upload
User Selection
Department Selection
```

Fields may define:

* Label
* Required status
* Default value
* Validation
* Display order

Conditional visibility may be added where appropriate.

---

## 8. Workflow Execution

Typical execution:

```text
Create Request
    ↓
Save Draft
    ↓
Submit
    ↓
Validate
    ↓
Determine Next Step
    ↓
Create Task
    ↓
User Performs Action
    ↓
Execute Transition
    ↓
Create Next Task
    ↓
Complete
```

Every transition must be validated by the backend.

---

## 9. Task Management

Task statuses:

```text
pending
in_progress
completed
cancelled
```

A task should track:

* Workflow instance
* Workflow step
* Assignee
* Status
* Due date
* Completion date
* Action taken

---

## 10. Approvals

Each approval records:

* Approver
* Decision
* Comments
* Date/time
* Workflow instance
* Workflow step

Decisions:

```text
approved
rejected
returned
```

Historical approval decisions must remain auditable.

---

## 11. Notifications

Initial priority:

* In-app notifications
* Notification badges
* Task assignment notifications
* Workflow status notifications

Email notifications may be processed asynchronously.

---

## 12. Attachments

Workflows may include supporting files.

Requirements:

* Secure storage
* File type validation
* File size validation
* Authorization before download
* Attachment metadata

Private files must not be publicly accessible by default.

---

## 13. Audit Trail

Record important events such as:

```text
Login
User Created
Permission Changed
Workflow Created
Workflow Published
Request Submitted
Task Assigned
Approved
Rejected
Returned
Completed
```

Audit records should identify:

```text
User
Action
Entity
Entity ID
Timestamp
```

Additional metadata may be recorded where appropriate.

---

## 14. Dashboard and Reports

Initial metrics may include:

* Active workflows
* Pending requests
* Pending tasks
* Completed workflows
* Rejected workflows
* Average completion time
* Department activity

Only display metrics that can be accurately calculated from system data.

---

## 15. MVP

The first complete MVP should include:

### Authentication

* Login
* Logout
* Secure password hashing
* Token/session management

### Administration

* Users
* Organizations
* Departments
* Roles
* Permissions

### Workflow Configuration

* Create workflow
* Create steps
* Configure transitions
* Publish workflow

### Workflow Execution

* Create request
* Dynamic form
* Submit request
* Assign task
* Approve
* Reject
* Return

### Audit

* Authentication events
* Workflow events
* Approval events

---

## 16. First Demonstration Workflow

Build the first complete workflow as:

# Purchase Request

```text
Requester
    ↓
Purchase Request Form
    ↓
Supervisor Review
    ↓
Budget Review
    ↓
Final Approval
    ↓
Completed
```

The demonstration must show:

1. User creates a request.
2. User completes a dynamic form.
3. User submits the request.
4. System creates the next task.
5. Assigned user reviews the request.
6. User approves, rejects, or returns it.
7. Workflow advances according to its transition rules.
8. Audit trail records the activity.

---

## 17. Development Roadmap

### Phase 1 — Foundation

```text
Authentication
→ Users
→ Organizations
→ Departments
→ Roles
→ Permissions
```

### Phase 2 — Workflow Configuration

```text
Workflows
→ Steps
→ Transitions
→ Publishing
```

### Phase 3 — Dynamic Forms

```text
Form Builder
→ Fields
→ Validation
→ Rendering
```

### Phase 4 — Workflow Execution

```text
Create Instance
→ Submit
→ Assign Task
→ Execute Transition
```

### Phase 5 — Tasks and Approvals

```text
Task Inbox
→ Review
→ Approve
→ Reject
→ Return
```

### Phase 6 — Supporting Features

```text
Notifications
→ Attachments
→ Audit Logs
→ Dashboard
→ Reports
```

---

## 18. Product Scope

FlowForge is not initially intended to be:

* A complete ERP.
* A replacement for every specialized business system.
* A microservices demonstration.
* A full no-code platform from day one.

The priority is:

> Build a reliable, configurable enterprise workflow automation platform.

---

## 19. Portfolio Objective

FlowForge should demonstrate competence in:

* Enterprise application architecture
* TypeScript full-stack development
* Relational database design
* Authentication and authorization
* Dynamic forms
* Workflow engines
* Multi-step approvals
* Task management
* Auditability
* REST API design
* Automated testing
* Production deployment

The project should be presented as:

> **A configurable enterprise workflow automation platform for digitizing and automating organizational business processes.**

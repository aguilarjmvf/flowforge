# CLAUDE.md — FlowForge Development Rules

## 1. Context

FlowForge is an enterprise workflow automation platform. Read `PROJECT.md` for product requirements, scope, modules, and roadmap.

Build incrementally. Do not invent requirements.

---

## 2. Tech Stack

| Layer                | Technology                            |
| -------------------- | ------------------------------------- |
| **Frontend**         | Next.js + React + TypeScript          |
| **UI**               | Tailwind CSS + shadcn/ui              |
| **Backend**          | NestJS + TypeScript                   |
| **API**              | REST + OpenAPI                        |
| **Database**         | PostgreSQL                            |
| **ORM**              | Drizzle ORM                           |
| **Validation**       | Zod                                   |
| **Auth**             | JWT + OAuth/OIDC where applicable     |
| **Password Hashing** | Argon2id preferred; bcrypt acceptable |
| **2FA**              | TOTP                                  |
| **Queues/Cache**     | Redis + BullMQ                        |
| **Storage**          | S3-compatible object storage          |
| **Testing**          | Vitest + Playwright                   |
| **Containerization** | Docker                                |
| **CI/CD**            | GitHub Actions                        |

---

## 3. Architecture

Use a **modular monolith** initially.

```text
Next.js Frontend
        ↓ REST API
NestJS Backend
        ↓
PostgreSQL
        ↓
Redis/BullMQ for async jobs
```

Do not introduce microservices, Kafka, Kubernetes, GraphQL, or other infrastructure unless there is a clear requirement.

Backend modules should have clear boundaries:

```text
auth
users
organizations
departments
roles
permissions
workflows
forms
workflow-instances
tasks
approvals
notifications
attachments
audit-logs
reports
```

---

## 4. Development Rules

Before changing code:

1. Read the relevant `PROJECT.md` requirements.
2. Inspect existing code and schema.
3. Identify affected modules.
4. Reuse existing patterns.
5. Implement the smallest complete scope.
6. Add validation and authorization.
7. Test the change.
8. Check for regressions.

Do not:

* Overwrite working features unnecessarily.
* Modify unrelated modules.
* Invent business rules.
* Perform premature refactors.
* Introduce unnecessary dependencies.
* Use microservices prematurely.
* Trust frontend validation for security.
* Expose secrets or internal stack traces.

If requirements are ambiguous, make the smallest reasonable assumption and state it briefly.

---

## 5. Backend Rules

Use domain-based modules.

Each module should contain appropriate:

* Controllers
* Services
* Database access
* Validation
* Types
* Tests

Use REST conventions and consistent API responses.

Success:

```json
{ "success": true, "data": {} }
```

Error:

```json
{ "success": false, "message": "...", "errors": {} }
```

Validate all external input:

* Body
* Query parameters
* Route parameters
* Files

Backend validation is mandatory.

---

## 6. Database Rules

Use PostgreSQL + Drizzle ORM.

Prioritize:

* Foreign keys
* Indexes
* Referential integrity
* Consistent naming
* Appropriate normalization

Use JSON/JSONB only when flexibility is genuinely required, such as configurable form data.

Use migrations for schema changes.

Before changing the schema, inspect related tables and existing data.

---

## 7. Authentication and Authorization

Authentication answers:

> Who is the user?

Authorization answers:

> What may the user do?

Every protected backend operation must enforce authorization.

Use permission-based access control where possible:

```text
users.view
users.create
workflows.create
workflows.publish
tasks.complete
approvals.approve
reports.view
```

Never rely solely on:

* Hidden frontend buttons
* Client-side route guards
* User-supplied roles

---

## 8. Workflow Rules

Workflow transitions are controlled backend business operations.

Before executing a transition, verify:

1. Instance exists.
2. Workflow is active.
3. Current step is valid.
4. Transition is allowed.
5. User is authorized.
6. Required data is complete.

The frontend must never directly control workflow state.

Use database transactions for related operations such as:

```text
Approve
  → Update workflow state
  → Complete current task
  → Create next task
  → Create audit log
```

---

## 9. Audit and Security

Audit important business and security events:

* Login
* User/role/permission changes
* Workflow changes
* Submissions
* Task assignments
* Approvals
* Rejections
* Returns

Do not silently overwrite historical business decisions.

For files:

* Validate type and size.
* Do not trust original filenames.
* Use safe storage names.
* Keep private files private.
* Authorize downloads.

---

## 10. Async Processing

Use Redis + BullMQ for work that should not block API requests:

* Email
* Notifications
* Scheduled jobs
* Long-running processing

Do not queue simple, fast database operations unnecessarily.

---

## 11. Testing

Prioritize tests for:

* Authentication
* Authorization
* Workflow transitions
* Approval logic
* Task assignment
* Validation
* Data access permissions

Use:

* **Vitest** — unit/integration tests
* **Playwright** — end-to-end tests

---

## 12. Frontend Rules

Use reusable feature-based components.

Provide:

* Loading states
* Empty states
* Error states
* Success feedback
* Confirmation for destructive actions
* Responsive and accessible UI

Frontend authorization improves UX; backend authorization remains mandatory.

---

## 13. Implementation Response Format

When implementing a feature, keep responses concise:

```text
Plan:
- ...

Changes:
- ...

Testing:
- ...

Issues:
- ...
```

Do not repeat the contents of `CLAUDE.md` or `PROJECT.md` unnecessarily.

---

## 14. Development Method

Use an iterative Agile approach:

```text
Requirement
    ↓
Inspect
    ↓
Plan
    ↓
Implement
    ↓
Test
    ↓
Review
    ↓
Refine
```

Complete and stabilize one logical module before moving to the next major module.

Current phase:

```text
PHASE 1 — SYSTEM FOUNDATION
```

Priority:

```text
Authentication
→ Users
→ Organizations
→ Departments
→ Roles
→ Permissions
```

# PROJECT_STATUS.md — FlowForge

Last updated: 2026-07-26 (Phase 6 implementation)

---

## Current Phase

**Phase 6 — Supporting Features** ✓ Complete

All backend phases complete. Next: Frontend (Next.js)

---

## Overall Progress

| Phase | Description             | Status      |
| ----- | ----------------------- | ----------- |
| 1     | System Foundation       | Done        |
| 2     | Workflow Configuration  | Done        |
| 3     | Dynamic Forms           | Done        |
| 4     | Workflow Execution      | Done        |
| 5     | Tasks and Approvals     | Done        |
| 6     | Supporting Features     | Done        |

---

## Infrastructure

| Item                              | Status      | Notes                                                       |
| --------------------------------- | ----------- | ----------------------------------------------------------- |
| NestJS backend scaffold           | Done        | `backend/src/` with all module stubs                        |
| All module stubs created          | Done        | Each module has an empty `*.module.ts`                      |
| Dependencies installed            | Done        | JWT, Passport, Drizzle, Argon2, Zod, @nestjs/config         |
| ConfigModule (env vars)           | Done        | `.env` / `.env.example` with DB + JWT config                |
| DatabaseModule (Drizzle + pg)     | Done        | Global DB provider, injected via `DB` symbol                |
| Drizzle schema                    | Done        | 13 tables: + forms, form_fields                              |
| PostgreSQL + Docker               | Done        | Running via `docker-compose.yml`, migrations applied         |
| Swagger UI                        | Done        | Available at `http://localhost:3000/api/docs`                 |
| Common utilities                  | Done        | ZodValidationPipe, JwtAuthGuard, PermissionsGuard, @CurrentUser, @RequirePermissions, ApiResponse helpers |
| Next.js frontend                  | Not Started |                                                             |
| PostgreSQL running locally        | Pending     | Install PostgreSQL, create `flowforge` DB, run `npm run db:migrate` |
| Redis + BullMQ                    | Not Started |                                                             |
| Docker / docker-compose           | Not Started |                                                             |
| GitHub Actions CI                 | Not Started |                                                             |

---

## Module Status

### Phase 1 — Foundation

| Module          | Controller | Service | Schema | Validation | Tests | Status        |
| --------------- | ---------- | ------- | ------ | ---------- | ----- | ------------- |
| `auth`          | ✓          | ✓       | ✓      | ✓          | -     | Implemented   |
| `users`         | ✓          | ✓       | ✓      | ✓          | -     | Implemented   |
| `organizations` | ✓          | ✓       | ✓      | ✓          | -     | Implemented   |
| `departments`   | ✓          | ✓       | ✓      | ✓          | -     | Implemented   |
| `roles`         | ✓          | ✓       | ✓      | ✓          | -     | Implemented   |
| `permissions`   | ✓          | ✓       | ✓      | ✓          | -     | Implemented   |

### Phase 2 — Workflow Configuration

| Module      | Controller | Service | Schema | Validation | Tests | Status      |
| ----------- | ---------- | ------- | ------ | ---------- | ----- | ----------- |
| `workflows` | ✓          | ✓       | ✓      | ✓          | -     | Implemented |

### Phase 3 — Dynamic Forms

| Module  | Controller | Service | Schema | Validation | Tests | Status      |
| ------- | ---------- | ------- | ------ | ---------- | ----- | ----------- |
| `forms` | ✓          | ✓       | ✓      | ✓          | -     | Implemented |

### Phase 4–6 — Remaining Modules

| Module               | Status      |
| -------------------- | ----------- |
| `workflow-instances` | Implemented |
| `tasks`              | Implemented |
| `approvals`          | Implemented |
| `notifications`      | Implemented |
| `attachments`        | Implemented |
| `audit-logs`         | Implemented |
| `reports`            | Implemented |

---

## Changelog

| Date       | Change                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------- |
| 2026-07-26 | Project audited. NestJS scaffold confirmed with all module stubs.                               |
| 2026-07-26 | `PROJECT_STATUS.md` created.                                                                    |
| 2026-07-26 | Phase 1 implemented: auth, users, organizations, departments, roles, permissions modules.       |
| 2026-07-26 | Drizzle schema (8 tables) created. Initial migration SQL generated (`drizzle/0000_lovely_sandman.sql`). |
| 2026-07-26 | JWT auth (access + refresh tokens), Argon2id hashing, permission-based guards wired up.        |
| 2026-07-26 | 33 permission definitions seeded in `permissions.seed.ts`.                                     |
| 2026-07-26 | Docker Compose set up with PostgreSQL + Redis. Migrations applied via psql.                    |
| 2026-07-26 | Seed script created — super admin user + system roles + all permissions.                       |
| 2026-07-26 | Swagger UI added at `/api/docs`.                                                               |
| 2026-07-26 | Phase 2 implemented: workflows, workflow_steps, workflow_transitions schema + full CRUD API.   |
| 2026-07-26 | Publish validation enforces start + end steps. Draft-only edit rule enforced on all mutations. |
| 2026-07-26 | First workflow created and published: "Purchase Request" with 3 steps and 3 transitions.       |
| 2026-07-26 | Phase 3 implemented: forms + form_fields schema, full CRUD, 12 field types supported.          |
| 2026-07-26 | Form fields support: options (JSONB), validation rules (JSONB), conditional visibility (JSONB). |
| 2026-07-26 | forms.delete permission added (34 total). Seed fixed to prevent duplicate roles.               |
| 2026-07-26 | Purchase Request Form created with 4 fields: text, currency, dropdown, long_text.              |
| 2026-07-26 | Phase 4 implemented: workflow_instances + tasks schema, service, controller, DTOs.             |
| 2026-07-26 | Workflow execution flow: create draft → submit → approve/reject/return → complete/reject.      |
| 2026-07-26 | Task inbox endpoint at GET /api/tasks/my (resolves assignments by user, role, or department).  |
| 2026-07-26 | 6 new instance permissions + tasks.view/complete seeded (40 total). Migration 0003 applied.    |
| 2026-07-26 | Phase 5 implemented: approvals schema + service + controller. Approval decisions recorded on every transition. |
| 2026-07-26 | PATCH /api/tasks/:id/start added to let assignees claim a task as in_progress.                  |
| 2026-07-26 | approvals.view permission added (41 total). Migration 0004 applied.                            |
| 2026-07-26 | Phase 6 implemented: notifications, attachments, audit_logs schema + services + controllers.   |
| 2026-07-26 | Audit logs wired into workflow execution (create, submit, approve, reject, return, complete).   |
| 2026-07-26 | In-app notifications sent on task assignment and workflow status changes.                       |
| 2026-07-26 | Attachments: local file storage, 10MB limit, allowed MIME types, authorized download.          |
| 2026-07-26 | Reports: dashboard metrics, instance summary, department activity at /api/reports/*.           |
| 2026-07-26 | 44 permissions total. Migration 0005 applied. All backend phases complete.                     |

import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { WorkflowInstancesService } from './workflow-instances.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { DB } from '../database/database.module';

// ── fixtures ─────────────────────────────────────────────────────────────────

const INSTANCE_ID = 'inst-0001-0000-0000-000000000001';
const WORKFLOW_ID = 'wf-00001-0000-0000-000000000001';
const USER_ID    = 'user-0001-0000-0000-000000000001';
const STEP_ID    = 'step-0001-0000-0000-000000000001';
const TASK_ID    = 'task-0001-0000-0000-000000000001';

const MOCK_INSTANCE = {
  id: INSTANCE_ID,
  workflowId: WORKFLOW_ID,
  formId: null,
  referenceNumber: 'LR-2026-0001',
  title: 'Leave Request Test',
  formData: {},
  status: 'in_progress',
  submittedBy: USER_ID,
  currentStepId: STEP_ID,
  submittedAt: new Date(),
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const MOCK_DRAFT_INSTANCE = { ...MOCK_INSTANCE, status: 'draft' };

const MOCK_PENDING_TASK = {
  id: TASK_ID,
  workflowInstanceId: INSTANCE_ID,
  workflowStepId: STEP_ID,
  assignedUserId: USER_ID,
  assignedRoleId: null,
  assignedDepartmentId: null,
  status: 'pending',
  actionTaken: null,
  notes: null,
  dueDate: null,
  completedAt: null,
  completedBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const MOCK_WORKFLOW = {
  id: WORKFLOW_ID,
  name: 'Leave Request',
  status: 'published',
  steps: [
    {
      id: STEP_ID,
      workflowId: WORKFLOW_ID,
      name: 'Manager Approval',
      stepType: 'approval',
      isStart: false,
      isEnd: false,
      order: 2,
      assignedUserId: USER_ID,
      assignedRoleId: null,
      assignedDepartmentId: null,
      dueDateDays: null,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  transitions: [
    {
      id: 'tr-001',
      workflowId: WORKFLOW_ID,
      fromStepId: STEP_ID,
      toStepId: null,
      name: 'Reject',
      action: 'reject',
    },
    {
      id: 'tr-002',
      workflowId: WORKFLOW_ID,
      fromStepId: STEP_ID,
      toStepId: null,
      name: 'Approve and Complete',
      action: 'approve',
    },
  ],
};

// ── db mock factory ───────────────────────────────────────────────────────────

function chainWith(result: unknown[]) {
  const pending = Promise.resolve(result);
  const chain: Record<string, unknown> = {};
  // Every builder method returns the same chain so any terminal position works
  chain.from      = jest.fn().mockReturnValue(chain);
  chain.innerJoin = jest.fn().mockReturnValue(chain);
  chain.where     = jest.fn().mockReturnValue(chain);
  chain.orderBy   = jest.fn().mockReturnValue(chain);
  // Make the chain itself awaitable so `await db.select().from().where()` and
  // `await db.select().from().where().orderBy()` both resolve correctly
  chain.then    = (resolve: Parameters<Promise<unknown>['then']>[0], reject: Parameters<Promise<unknown>['then']>[1]) => pending.then(resolve, reject);
  chain.catch   = (reject: Parameters<Promise<unknown>['catch']>[0]) => pending.catch(reject);
  chain.finally = (fn: Parameters<Promise<unknown>['finally']>[0]) => pending.finally(fn);
  return chain;
}

function makeMockDb() {
  return {
    select: jest.fn(() => chainWith([])),
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        returning: jest.fn().mockResolvedValue([MOCK_INSTANCE]),
      })),
    })),
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn().mockResolvedValue([]),
      })),
    })),
  };
}

// ── helpers ──────────────────────────────────────────────────────────────────

/** Configure db.select() calls in order: first call returns instances, second returns tasks. */
function mockFindOne(db: ReturnType<typeof makeMockDb>, tasks = [MOCK_PENDING_TASK]) {
  db.select
    .mockReturnValueOnce(chainWith([MOCK_INSTANCE]))   // workflowInstances query
    .mockReturnValueOnce(chainWith(tasks));              // tasks query
}

function mockFindOneDraft(db: ReturnType<typeof makeMockDb>, tasks: unknown[] = []) {
  db.select
    .mockReturnValueOnce(chainWith([MOCK_DRAFT_INSTANCE]))
    .mockReturnValueOnce(chainWith(tasks));
}

// ── suite ─────────────────────────────────────────────────────────────────────

describe('WorkflowInstancesService', () => {
  let service: WorkflowInstancesService;
  let db: ReturnType<typeof makeMockDb>;
  let mockAuditLogs: jest.Mocked<Pick<AuditLogsService, 'log'>>;
  let mockNotifications: jest.Mocked<Pick<NotificationsService, 'create'>>;
  let mockMail: jest.Mocked<Pick<MailService, 'taskAssigned' | 'workflowStatusChanged'>>;

  beforeEach(async () => {
    db = makeMockDb();
    mockAuditLogs = { log: jest.fn().mockResolvedValue(undefined) };
    mockNotifications = { create: jest.fn().mockResolvedValue(undefined) };
    mockMail = {
      taskAssigned: jest.fn().mockResolvedValue(undefined),
      workflowStatusChanged: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        WorkflowInstancesService,
        { provide: DB, useValue: db },
        { provide: AuditLogsService, useValue: mockAuditLogs },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: MailService, useValue: mockMail },
      ],
    }).compile();

    service = module.get(WorkflowInstancesService);
    jest.clearAllMocks();
  });

  // ── findOne ─────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('throws NotFoundException when instance does not exist', async () => {
      db.select
        .mockReturnValueOnce(chainWith([]))  // no instance
        .mockReturnValueOnce(chainWith([])); // no tasks
      await expect(service.findOne('no-such-id')).rejects.toThrow(NotFoundException);
    });

    it('returns instance with tasks', async () => {
      mockFindOne(db);
      const result = await service.findOne(INSTANCE_ID);
      expect(result.id).toBe(INSTANCE_ID);
      expect(result.tasks).toHaveLength(1);
    });
  });

  // ── cancel ──────────────────────────────────────────────────────────────────

  describe('cancel', () => {
    it('throws ForbiddenException when called by a user who is not the submitter', async () => {
      mockFindOne(db);
      await expect(service.cancel(INSTANCE_ID, 'different-user-id')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws BadRequestException when instance is already completed', async () => {
      db.select
        .mockReturnValueOnce(chainWith([{ ...MOCK_INSTANCE, status: 'completed' }]))
        .mockReturnValueOnce(chainWith([]));
      await expect(service.cancel(INSTANCE_ID, USER_ID)).rejects.toThrow(BadRequestException);
    });
  });

  // ── submit ───────────────────────────────────────────────────────────────────

  describe('submit', () => {
    it('throws BadRequestException when instance is not in draft status', async () => {
      mockFindOne(db); // status: 'in_progress'
      await expect(service.submit(INSTANCE_ID, USER_ID)).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException when called by a user who is not the creator', async () => {
      mockFindOneDraft(db);
      await expect(service.submit(INSTANCE_ID, 'other-user-id')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ── executeTransition ────────────────────────────────────────────────────────

  describe('executeTransition', () => {
    it('throws BadRequestException when instance is not in_progress', async () => {
      db.select
        .mockReturnValueOnce(chainWith([MOCK_DRAFT_INSTANCE]))
        .mockReturnValueOnce(chainWith([]));
      await expect(
        service.executeTransition(INSTANCE_ID, { action: 'approve' }, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when there is no active task', async () => {
      db.select
        .mockReturnValueOnce(chainWith([MOCK_INSTANCE]))
        .mockReturnValueOnce(chainWith([])); // no tasks
      await expect(
        service.executeTransition(INSTANCE_ID, { action: 'approve' }, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects the instance and sends in-app + email notification', async () => {
      const rejectedInstance = { ...MOCK_INSTANCE, status: 'rejected', tasks: [] as any[] };

      // Spy on private helpers so we don't need to mock every DB query in order
      jest.spyOn(service as any, 'findOne')
        .mockResolvedValueOnce({ ...MOCK_INSTANCE, tasks: [MOCK_PENDING_TASK] })
        .mockResolvedValueOnce(rejectedInstance);

      jest.spyOn(service as any, 'getPublishedWorkflow')
        .mockResolvedValueOnce(MOCK_WORKFLOW);

      jest.spyOn(service as any, 'assertTaskAuthorized')
        .mockResolvedValueOnce(undefined);

      // getUser: return user with emailNotifications disabled so mail query is skipped
      jest.spyOn(service as any, 'getUser')
        .mockResolvedValue({ email: 'a@b.com', firstName: 'Alice', lastName: 'Test', emailNotifications: false });

      await service.executeTransition(INSTANCE_ID, { action: 'reject', notes: 'Not approved' }, USER_ID);

      expect(mockNotifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'workflow_rejected' }),
      );
      expect(mockAuditLogs.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'instance.rejected' }),
      );
    });
  });
});

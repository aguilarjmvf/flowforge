'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ApiResponse, WorkflowWithSteps, WorkflowStep, WorkflowTransition, Role, Department, UserDetail } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// ─── helpers ────────────────────────────────────────────────────────────────

const STEP_TYPES = ['start', 'review', 'approval', 'end'] as const;
const ACTIONS = ['submit', 'approve', 'reject', 'return'] as const;

function stepTypeBadge(type: string) {
  const map: Record<string, string> = {
    start: 'bg-green-100 text-green-800',
    review: 'bg-blue-100 text-blue-800',
    approval: 'bg-purple-100 text-purple-800',
    end: 'bg-gray-100 text-gray-800',
  };
  return map[type] ?? 'bg-gray-100 text-gray-800';
}

function actionBadge(action: string) {
  const map: Record<string, string> = {
    submit: 'bg-blue-100 text-blue-800',
    approve: 'bg-green-100 text-green-800',
    reject: 'bg-red-100 text-red-800',
    return: 'bg-yellow-100 text-yellow-800',
  };
  return map[action] ?? 'bg-gray-100 text-gray-800';
}

// ─── step form state ────────────────────────────────────────────────────────

interface StepForm {
  name: string;
  description: string;
  stepType: string;
  isStart: boolean;
  isEnd: boolean;
  assignedUserId: string;
  assignedRoleId: string;
  assignedDepartmentId: string;
  dueDateDays: string;
}

const emptyStepForm = (): StepForm => ({
  name: '',
  description: '',
  stepType: 'review',
  isStart: false,
  isEnd: false,
  assignedUserId: '',
  assignedRoleId: '',
  assignedDepartmentId: '',
  dueDateDays: '',
});

// ─── transition form state ───────────────────────────────────────────────────

interface TransitionForm {
  fromStepId: string;
  toStepId: string;
  name: string;
  action: string;
}

const emptyTransitionForm = (): TransitionForm => ({
  fromStepId: '',
  toStepId: '',
  name: '',
  action: 'approve',
});

// ─── component ───────────────────────────────────────────────────────────────

export default function WorkflowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [workflow, setWorkflow] = useState<WorkflowWithSteps | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // step modal
  const [stepModalOpen, setStepModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [stepForm, setStepForm] = useState<StepForm>(emptyStepForm());
  const [stepSaving, setStepSaving] = useState(false);
  const [stepError, setStepError] = useState('');

  // transition modal
  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [editingTransition, setEditingTransition] = useState<WorkflowTransition | null>(null);
  const [transitionForm, setTransitionForm] = useState<TransitionForm>(emptyTransitionForm());
  const [transitionSaving, setTransitionSaving] = useState(false);
  const [transitionError, setTransitionError] = useState('');

  // delete confirms
  const [deletingStepId, setDeletingStepId] = useState<string | null>(null);
  const [deletingTransitionId, setDeletingTransitionId] = useState<string | null>(null);

  const loadWorkflow = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<WorkflowWithSteps>>(`/workflows/${id}`);
      if (res.success && res.data) {
        const w = res.data;
        // sort steps by order
        if (w.steps) w.steps.sort((a, b) => a.order - b.order);
        setWorkflow(w);
      }
    } catch {
      setError('Failed to load workflow.');
    }
  }, [id]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([
        loadWorkflow(),
        api.get<ApiResponse<Role[]>>('/roles').then(r => r.data && setRoles(r.data)),
        api.get<ApiResponse<Department[]>>('/departments').then(r => r.data && setDepartments(r.data)),
        api.get<ApiResponse<UserDetail[]>>('/users').then(r => r.data && setUsers(r.data)),
      ]);
      setLoading(false);
    }
    init();
  }, [loadWorkflow]);

  // ── step helpers ────────────────────────────────────────────────────────────

  function openAddStep() {
    setEditingStep(null);
    setStepForm(emptyStepForm());
    setStepError('');
    setStepModalOpen(true);
  }

  function openEditStep(step: WorkflowStep) {
    setEditingStep(step);
    setStepForm({
      name: step.name,
      description: step.description ?? '',
      stepType: step.stepType,
      isStart: step.isStart,
      isEnd: step.isEnd,
      assignedUserId: step.assignedUserId ?? '',
      assignedRoleId: step.assignedRoleId ?? '',
      assignedDepartmentId: step.assignedDepartmentId ?? '',
      dueDateDays: step.dueDateDays != null ? String(step.dueDateDays) : '',
    });
    setStepError('');
    setStepModalOpen(true);
  }

  async function saveStep() {
    if (!stepForm.name.trim()) { setStepError('Name is required.'); return; }
    setStepSaving(true);
    setStepError('');
    const body: Record<string, unknown> = {
      name: stepForm.name.trim(),
      description: stepForm.description.trim() || undefined,
      stepType: stepForm.stepType,
      isStart: stepForm.isStart,
      isEnd: stepForm.isEnd,
      assignedUserId: stepForm.assignedUserId || undefined,
      assignedRoleId: stepForm.assignedRoleId || undefined,
      assignedDepartmentId: stepForm.assignedDepartmentId || undefined,
      dueDateDays: stepForm.dueDateDays ? parseInt(stepForm.dueDateDays) : undefined,
    };
    if (!editingStep) {
      body.order = (workflow?.steps?.length ?? 0);
    }
    try {
      if (editingStep) {
        await api.patch(`/workflows/${id}/steps/${editingStep.id}`, body);
      } else {
        await api.post(`/workflows/${id}/steps`, body);
      }
      await loadWorkflow();
      setStepModalOpen(false);
    } catch (e: unknown) {
      setStepError(e instanceof Error ? e.message : 'Failed to save step.');
    } finally {
      setStepSaving(false);
    }
  }

  async function deleteStep(stepId: string) {
    try {
      await api.delete(`/workflows/${id}/steps/${stepId}`);
      await loadWorkflow();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to delete step.');
    } finally {
      setDeletingStepId(null);
    }
  }

  // ── transition helpers ──────────────────────────────────────────────────────

  function openAddTransition() {
    setEditingTransition(null);
    setTransitionForm(emptyTransitionForm());
    setTransitionError('');
    setTransitionModalOpen(true);
  }

  function openEditTransition(t: WorkflowTransition) {
    setEditingTransition(t);
    setTransitionForm({
      fromStepId: t.fromStepId,
      toStepId: t.toStepId ?? '',
      name: t.name,
      action: t.action,
    });
    setTransitionError('');
    setTransitionModalOpen(true);
  }

  async function saveTransition() {
    if (!transitionForm.fromStepId) { setTransitionError('From step is required.'); return; }
    if (!transitionForm.name.trim()) { setTransitionError('Name is required.'); return; }
    setTransitionSaving(true);
    setTransitionError('');
    const body = {
      fromStepId: transitionForm.fromStepId,
      toStepId: transitionForm.toStepId || undefined,
      name: transitionForm.name.trim(),
      action: transitionForm.action,
    };
    try {
      if (editingTransition) {
        await api.patch(`/workflows/${id}/transitions/${editingTransition.id}`, body);
      } else {
        await api.post(`/workflows/${id}/transitions`, body);
      }
      await loadWorkflow();
      setTransitionModalOpen(false);
    } catch (e: unknown) {
      setTransitionError(e instanceof Error ? e.message : 'Failed to save transition.');
    } finally {
      setTransitionSaving(false);
    }
  }

  async function deleteTransition(transitionId: string) {
    try {
      await api.delete(`/workflows/${id}/transitions/${transitionId}`);
      await loadWorkflow();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to delete transition.');
    } finally {
      setDeletingTransitionId(null);
    }
  }

  // ── step name lookup ────────────────────────────────────────────────────────

  function stepName(stepId: string | null) {
    if (!stepId) return '(end / terminal)';
    return workflow?.steps?.find(s => s.id === stepId)?.name ?? stepId;
  }

  function assigneeLabel(step: WorkflowStep) {
    if (step.assignedUserId) {
      const u = users.find(x => x.id === step.assignedUserId);
      return u ? `${u.firstName} ${u.lastName}` : 'User';
    }
    if (step.assignedRoleId) {
      return roles.find(x => x.id === step.assignedRoleId)?.name ?? 'Role';
    }
    if (step.assignedDepartmentId) {
      return departments.find(x => x.id === step.assignedDepartmentId)?.name ?? 'Department';
    }
    return null;
  }

  const isDraft = workflow?.status === 'draft';

  // ── render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-8 text-gray-500">Loading workflow...</div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="p-8">
        <p className="text-red-600 mb-4">{error || 'Workflow not found.'}</p>
        <Button variant="secondary" onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{workflow.name}</h1>
          {workflow.description && <p className="text-sm text-gray-500 mt-0.5">{workflow.description}</p>}
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
          workflow.status === 'published' ? 'bg-green-100 text-green-800' :
          workflow.status === 'archived' ? 'bg-gray-100 text-gray-600' :
          'bg-yellow-100 text-yellow-800'
        }`}>{workflow.status}</span>
      </div>

      {!isDraft && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          This workflow is <strong>{workflow.status}</strong>. Steps and transitions can only be edited on draft workflows.
        </div>
      )}

      {/* Steps */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Steps</CardTitle>
            {isDraft && (
              <Button size="sm" onClick={openAddStep}>Add Step</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {(!workflow.steps || workflow.steps.length === 0) ? (
            <p className="text-sm text-gray-400 py-4 text-center">No steps yet. Add your first step above.</p>
          ) : (
            <div className="space-y-2">
              {workflow.steps.map((step, idx) => (
                <div key={step.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">{step.name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${stepTypeBadge(step.stepType)}`}>
                        {step.stepType}
                      </span>
                      {step.isStart && <span className="px-2 py-0.5 rounded text-xs bg-green-50 text-green-700 border border-green-200">Start</span>}
                      {step.isEnd && <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 border border-gray-200">End</span>}
                    </div>
                    {step.description && <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>}
                    {assigneeLabel(step) && (
                      <p className="text-xs text-gray-500 mt-0.5">Assignee: <span className="font-medium">{assigneeLabel(step)}</span></p>
                    )}
                    {step.dueDateDays && (
                      <p className="text-xs text-gray-500 mt-0.5">Due in {step.dueDateDays} day(s)</p>
                    )}
                  </div>
                  {isDraft && (
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => openEditStep(step)}>Edit</Button>
                      {deletingStepId === step.id ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="danger" onClick={() => deleteStep(step.id)}>Confirm</Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeletingStepId(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => setDeletingStepId(step.id)}>
                          <span className="text-red-500">Delete</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transitions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transitions</CardTitle>
            {isDraft && workflow.steps && workflow.steps.length >= 1 && (
              <Button size="sm" onClick={openAddTransition}>Add Transition</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {(!workflow.transitions || workflow.transitions.length === 0) ? (
            <p className="text-sm text-gray-400 py-4 text-center">No transitions yet. Add steps first, then define how they connect.</p>
          ) : (
            <div className="space-y-2">
              {workflow.transitions.map(t => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                  <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 text-sm">{t.name}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionBadge(t.action)}`}>{t.action}</span>
                    <span className="text-xs text-gray-400">
                      {stepName(t.fromStepId)} → {stepName(t.toStepId)}
                    </span>
                  </div>
                  {isDraft && (
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => openEditTransition(t)}>Edit</Button>
                      {deletingTransitionId === t.id ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="danger" onClick={() => deleteTransition(t.id)}>Confirm</Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeletingTransitionId(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => setDeletingTransitionId(t.id)}>
                          <span className="text-red-500">Delete</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step Modal */}
      {stepModalOpen && (
        <Modal title={editingStep ? 'Edit Step' : 'Add Step'} onClose={() => setStepModalOpen(false)}>
          <div className="space-y-4">
            <Input
              label="Name *"
              value={stepForm.name}
              onChange={e => setStepForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Supervisor Review"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                value={stepForm.description}
                onChange={e => setStepForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Step Type *</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={stepForm.stepType}
                onChange={e => setStepForm(f => ({ ...f, stepType: e.target.value }))}
              >
                {STEP_TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={stepForm.isStart}
                  onChange={e => setStepForm(f => ({ ...f, isStart: e.target.checked }))}
                  className="rounded"
                />
                Mark as Start step
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={stepForm.isEnd}
                  onChange={e => setStepForm(f => ({ ...f, isEnd: e.target.checked }))}
                  className="rounded"
                />
                Mark as End step
              </label>
            </div>
            <div className="border-t pt-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Assignee (pick one)</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={stepForm.assignedUserId}
                    onChange={e => setStepForm(f => ({ ...f, assignedUserId: e.target.value, assignedRoleId: '', assignedDepartmentId: '' }))}
                  >
                    <option value="">— None —</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={stepForm.assignedRoleId}
                    onChange={e => setStepForm(f => ({ ...f, assignedRoleId: e.target.value, assignedUserId: '', assignedDepartmentId: '' }))}
                  >
                    <option value="">— None —</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={stepForm.assignedDepartmentId}
                    onChange={e => setStepForm(f => ({ ...f, assignedDepartmentId: e.target.value, assignedUserId: '', assignedRoleId: '' }))}
                  >
                    <option value="">— None —</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <Input
              label="Due Date (days)"
              type="number"
              value={stepForm.dueDateDays}
              onChange={e => setStepForm(f => ({ ...f, dueDateDays: e.target.value }))}
              placeholder="e.g. 3"
            />
            {stepError && <p className="text-sm text-red-600">{stepError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setStepModalOpen(false)}>Cancel</Button>
              <Button onClick={saveStep} loading={stepSaving}>
                {editingStep ? 'Save Changes' : 'Add Step'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Transition Modal */}
      {transitionModalOpen && (
        <Modal title={editingTransition ? 'Edit Transition' : 'Add Transition'} onClose={() => setTransitionModalOpen(false)}>
          <div className="space-y-4">
            <Input
              label="Transition Name *"
              value={transitionForm.name}
              onChange={e => setTransitionForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Approve and proceed"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action *</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={transitionForm.action}
                onChange={e => setTransitionForm(f => ({ ...f, action: e.target.value }))}
              >
                {ACTIONS.map(a => (
                  <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Step *</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={transitionForm.fromStepId}
                onChange={e => setTransitionForm(f => ({ ...f, fromStepId: e.target.value }))}
              >
                <option value="">— Select step —</option>
                {workflow.steps?.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Step</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={transitionForm.toStepId}
                onChange={e => setTransitionForm(f => ({ ...f, toStepId: e.target.value }))}
              >
                <option value="">— Terminal (end of workflow) —</option>
                {workflow.steps?.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            {transitionError && <p className="text-sm text-red-600">{transitionError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setTransitionModalOpen(false)}>Cancel</Button>
              <Button onClick={saveTransition} loading={transitionSaving}>
                {editingTransition ? 'Save Changes' : 'Add Transition'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

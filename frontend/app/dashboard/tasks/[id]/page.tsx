'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, statusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import type { ApiResponse, TaskWithContext, WorkflowInstance, Approval, Attachment, Form } from '@/types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

type TransitionAction = 'approve' | 'reject' | 'return';

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fieldLabel(key: string, form: Form | null) {
  const field = form?.fields?.find(f => f.fieldKey === key);
  return field?.label ?? key.replace(/_/g, ' ');
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [taskCtx, setTaskCtx] = useState<TaskWithContext | null>(null);
  const [instance, setInstance] = useState<WorkflowInstance | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // action modal state
  const [action, setAction] = useState<TransitionAction | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [starting, setStarting] = useState(false);

  async function load() {
    try {
      const tasksRes = await api.get<ApiResponse<TaskWithContext[]>>('/tasks/my');
      const ctx = (tasksRes.data ?? []).find(t => t.task.id === id);
      if (!ctx) { setNotFound(true); setLoading(false); return; }
      setTaskCtx(ctx);

      const instanceId = ctx.task.workflowInstanceId;
      const [instRes, apprRes, attRes] = await Promise.all([
        api.get<ApiResponse<WorkflowInstance>>(`/instances/${instanceId}`),
        api.get<ApiResponse<Approval[]>>(`/approvals/instance/${instanceId}`),
        api.get<ApiResponse<Attachment[]>>(`/attachments/instance/${instanceId}`),
      ]);
      const inst = instRes.data ?? null;
      setInstance(inst);
      setApprovals(apprRes.data ?? []);
      setAttachments(attRes.data ?? []);

      if (inst?.formId) {
        const formRes = await api.get<ApiResponse<Form>>(`/forms/${inst.formId}`);
        setForm(formRes.data ?? null);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleStart() {
    if (!taskCtx) return;
    setStarting(true);
    try {
      await api.patch(`/tasks/${id}/start`, {});
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to start task');
    } finally {
      setStarting(false);
    }
  }

  async function handleTransition() {
    if (!action || !instance) return;
    if (action !== 'approve' && !notes.trim()) {
      setActionError('Notes are required for this action.');
      return;
    }
    setSubmitting(true);
    setActionError('');
    try {
      await api.post(`/instances/${instance.id}/transition`, {
        action,
        notes: notes.trim() || undefined,
      });
      router.push('/dashboard/tasks');
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
      setSubmitting(false);
    }
  }

  function downloadUrl(attachId: string) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
    return `${BASE}/attachments/${attachId}/download?token=${token}`;
  }

  if (loading) {
    return (
      <div>
        <Header />
        <div className="p-6 max-w-3xl mx-auto space-y-4">
          {[...Array(3)].map((_, i) => <Card key={i}><CardContent className="h-24 animate-pulse bg-gray-50" /></Card>)}
        </div>
      </div>
    );
  }

  if (notFound || !taskCtx) {
    return (
      <div>
        <Header />
        <div className="p-6 text-center text-gray-500">Task not found.</div>
      </div>
    );
  }

  const task = taskCtx.task;
  const step = taskCtx.step;
  const isInProgress = task.status === 'in_progress';
  const isPending = task.status === 'pending';
  const formEntries = instance?.formData ? Object.entries(instance.formData) : [];

  return (
    <div>
      <Header />
      <div className="p-6 max-w-3xl mx-auto space-y-5">

        <button onClick={() => router.back()} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
          ← Back to Tasks
        </button>

        {/* Task header */}
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={statusBadge(task.status)}>{task.status.replace('_', ' ')}</Badge>
                  {step && <span className="text-sm text-gray-500">Step: {step.name}</span>}
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {instance?.title ?? 'Task'}
                </h2>
                {instance && (
                  <p className="text-xs font-mono text-gray-400 mt-0.5">{instance.referenceNumber}</p>
                )}
                {task.dueDate && (
                  <p className="text-sm text-amber-600 mt-1">
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 shrink-0">
                {isPending && (
                  <Button size="sm" variant="secondary" onClick={handleStart} loading={starting}>
                    Start Task
                  </Button>
                )}
                {isInProgress && (
                  <>
                    <Button size="sm" variant="success" onClick={() => { setAction('approve'); setNotes(''); setActionError(''); }}>
                      Approve
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => { setAction('return'); setNotes(''); setActionError(''); }}>
                      Return
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => { setAction('reject'); setNotes(''); setActionError(''); }}>
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inline action panel */}
        {action && (
          <Card>
            <CardHeader>
              <CardTitle>
                {action === 'approve' ? 'Approve Request' : action === 'reject' ? 'Reject Request' : 'Return for Revision'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes {action !== 'approve' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={action === 'approve' ? 'Optional comments…' : 'Required — explain your decision'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {actionError && <p className="text-sm text-red-600">{actionError}</p>}
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" onClick={() => setAction(null)}>Cancel</Button>
                <Button
                  variant={action === 'approve' ? 'primary' : action === 'reject' ? 'danger' : 'secondary'}
                  loading={submitting}
                  onClick={handleTransition}
                >
                  {action === 'approve' ? 'Approve' : action === 'reject' ? 'Reject' : 'Return'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Form data */}
        {formEntries.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Form Data</CardTitle></CardHeader>
            <CardContent>
              <dl className="divide-y divide-gray-100">
                {formEntries.map(([key, value]) => (
                  <div key={key} className="py-2.5 grid grid-cols-3 gap-4">
                    <dt className="text-sm font-medium text-gray-500">{fieldLabel(key, form)}</dt>
                    <dd className="col-span-2 text-sm text-gray-900">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Attachments</CardTitle></CardHeader>
            <CardContent>
              <ul className="divide-y divide-gray-100">
                {attachments.map(a => (
                  <li key={a.id} className="py-2.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{a.originalName}</p>
                        <p className="text-xs text-gray-400">{formatBytes(a.sizeBytes)}</p>
                      </div>
                    </div>
                    <a href={downloadUrl(a.id)} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline shrink-0">Download</a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Approval history */}
        {approvals.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Approval History</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-gray-100">
                {approvals.map(a => (
                  <li key={a.approval.id} className="px-6 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={statusBadge(a.approval.decision)}>{a.approval.decision}</Badge>
                          <span className="text-sm font-medium text-gray-700">
                            {a.approver ? `${a.approver.firstName} ${a.approver.lastName}` : 'Unknown'}
                          </span>
                          {a.step && <span className="text-xs text-gray-400">at {a.step.name}</span>}
                        </div>
                        {a.approval.comments && (
                          <p className="text-xs text-gray-500 mt-1 italic">"{a.approval.comments}"</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">
                        {new Date(a.approval.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}

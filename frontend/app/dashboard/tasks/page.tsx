'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, statusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { api } from '@/lib/api';
import type { ApiResponse, TaskWithContext } from '@/types';

type TransitionAction = 'approve' | 'reject' | 'return';

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TaskWithContext | null>(null);
  const [action, setAction] = useState<TransitionAction>('approve');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    api.get<ApiResponse<TaskWithContext[]>>('/tasks/my')
      .then((res) => setTasks(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleStart(taskId: string, instanceId: string) {
    await api.patch(`/tasks/${taskId}/start`, {});
    load();
  }

  function openModal(t: TaskWithContext, a: TransitionAction) {
    setSelected(t);
    setAction(a);
    setNotes('');
    setError('');
  }

  async function handleTransition() {
    if (!selected?.instance) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/instances/${selected.instance.id}/transition`, { action, notes: notes || undefined });
      setSelected(null);
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Action failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const pending = tasks.filter((t) => t.task.status === 'pending');
  const inProgress = tasks.filter((t) => t.task.status === 'in_progress');

  return (
    <div>
      <Header title="My Tasks" />
      <div className="p-6 max-w-4xl mx-auto">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Card key={i}><CardContent className="h-24 animate-pulse bg-gray-50" /></Card>)}
          </div>
        ) : tasks.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-gray-500 font-medium">All caught up!</p>
              <p className="text-sm text-gray-400 mt-1">No tasks assigned to you right now.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {inProgress.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">In Progress</h2>
                <div className="space-y-3">
                  {inProgress.map((t) => <TaskCard key={t.task.id} t={t} onAction={openModal} onStart={handleStart} />)}
                </div>
              </section>
            )}
            {pending.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Pending</h2>
                <div className="space-y-3">
                  {pending.map((t) => <TaskCard key={t.task.id} t={t} onAction={openModal} onStart={handleStart} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {selected && (
        <Modal
          title={action === 'approve' ? 'Approve Request' : action === 'reject' ? 'Reject Request' : 'Return for Revision'}
          onClose={() => setSelected(null)}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              <strong>{selected.instance?.title}</strong>
              {selected.step && <span className="text-gray-400"> — {selected.step.name}</span>}
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes {action !== 'approve' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={action === 'approve' ? 'Optional comments...' : 'Required — explain your decision'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setSelected(null)}>Cancel</Button>
              <Button
                variant={action === 'approve' ? 'primary' : action === 'reject' ? 'danger' : 'secondary'}
                loading={submitting}
                onClick={handleTransition}
              >
                {action === 'approve' ? 'Approve' : action === 'reject' ? 'Reject' : 'Return'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function TaskCard({
  t,
  onAction,
  onStart,
}: {
  t: TaskWithContext;
  onAction: (t: TaskWithContext, a: TransitionAction) => void;
  onStart: (taskId: string, instanceId: string) => void;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={statusBadge(t.task.status)}>
                {t.task.status.replace('_', ' ')}
              </Badge>
              {t.step && <span className="text-xs text-gray-500">{t.step.name}</span>}
            </div>
            {t.instance ? (
              <>
                <Link href={`/dashboard/requests/${t.instance.id}`} className="font-medium text-gray-900 hover:text-blue-600 truncate block">
                  {t.instance.title}
                </Link>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">{t.instance.referenceNumber}</p>
              </>
            ) : (
              <p className="text-sm text-gray-500">—</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {t.task.status === 'pending' && (
              <Button size="sm" variant="secondary" onClick={() => onStart(t.task.id, t.instance?.id ?? '')}>
                Start
              </Button>
            )}
            {t.task.status === 'in_progress' && (
              <>
                <Button size="sm" variant="success" onClick={() => onAction(t, 'approve')}>Approve</Button>
                <Button size="sm" variant="secondary" onClick={() => onAction(t, 'return')}>Return</Button>
                <Button size="sm" variant="danger" onClick={() => onAction(t, 'reject')}>Reject</Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

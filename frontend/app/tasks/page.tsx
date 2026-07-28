'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, statusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { api } from '@/lib/api';
import type { ApiResponse, TaskWithContext } from '@/types';

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TaskWithContext | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | 'return' | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    api.get<ApiResponse<TaskWithContext[]>>('/tasks/my?status=pending')
      .then((res) => setTasks(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleTransition() {
    if (!selected || !action) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/instances/${selected.task.workflowInstanceId}/transition`, { action, notes });
      setSelected(null);
      setAction(null);
      setNotes('');
      load();
    } catch (err: any) {
      setError(err.message ?? 'Action failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStart(task: TaskWithContext) {
    try {
      await api.patch(`/tasks/${task.task.id}/start`);
      load();
    } catch {}
  }

  const actionLabels = { approve: 'Approve', reject: 'Reject', return: 'Return for Revision' };
  const actionVariants = { approve: 'primary', reject: 'danger', return: 'secondary' } as const;

  return (
    <div>
      <Header title="My Tasks" />
      <div className="p-6 max-w-4xl mx-auto">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Card key={i}><CardContent className="h-20 animate-pulse bg-gray-50" /></Card>)}
          </div>
        ) : tasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-4xl mb-3">✓</p>
              <p className="text-gray-500 font-medium">No pending tasks</p>
              <p className="text-sm text-gray-400 mt-1">You're all caught up!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tasks.map((item) => (
              <Card key={item.task.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={statusBadge(item.task.status)}>
                          {item.task.status.replace('_', ' ')}
                        </Badge>
                        {item.instance?.referenceNumber && (
                          <span className="text-xs text-gray-400 font-mono">{item.instance.referenceNumber}</span>
                        )}
                      </div>
                      <p className="font-medium text-gray-900 truncate">{item.instance?.title ?? 'Untitled Request'}</p>
                      <p className="text-sm text-gray-500 mt-0.5">Step: {item.step?.name ?? '—'}</p>
                      {item.task.dueDate && (
                        <p className="text-xs text-gray-400 mt-1">
                          Due: {new Date(item.task.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.task.status === 'pending' && (
                        <Button size="sm" variant="outline" onClick={() => handleStart(item)}>
                          Start
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => window.location.href = `/requests/${item.task.workflowInstanceId}`}>
                        View
                      </Button>
                      <Button size="sm" variant="success" onClick={() => { setSelected(item); setAction('approve'); }}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setSelected(item); setAction('return'); }}>
                        Return
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => { setSelected(item); setAction('reject'); }}>
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={!!selected && !!action}
        onClose={() => { setSelected(null); setAction(null); setNotes(''); setError(''); }}
        title={action ? actionLabels[action] : ''}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {action === 'approve' && 'Approve this request and advance to the next step.'}
            {action === 'reject' && 'Reject this request. This action cannot be undone.'}
            {action === 'return' && 'Return this request to the requester for revision.'}
          </p>
          <div>
            <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add a comment..."
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setSelected(null); setAction(null); setNotes(''); setError(''); }}>
              Cancel
            </Button>
            <Button
              variant={action ? actionVariants[action] : 'primary'}
              loading={submitting}
              onClick={handleTransition}
            >
              {action ? actionLabels[action] : 'Confirm'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

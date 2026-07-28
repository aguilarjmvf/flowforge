'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, statusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import type { ApiResponse, WorkflowInstance, Approval } from '@/types';

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [instance, setInstance] = useState<WorkflowInstance | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  function load() {
    Promise.all([
      api.get<ApiResponse<WorkflowInstance>>(`/instances/${id}`),
      api.get<ApiResponse<Approval[]>>(`/approvals/instance/${id}`),
    ]).then(([inst, appr]) => {
      setInstance(inst.data ?? null);
      setApprovals(appr.data ?? []);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [id]);

  async function handleCancel() {
    if (!confirm('Cancel this request?')) return;
    setCancelling(true);
    try {
      await api.delete(`/instances/${id}/cancel`);
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCancelling(false);
    }
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

  if (!instance) {
    return (
      <div>
        <Header />
        <div className="p-6 text-center text-gray-500">Request not found.</div>
      </div>
    );
  }

  const canCancel = ['draft', 'in_progress'].includes(instance.status);

  return (
    <div>
      <Header />
      <div className="p-6 max-w-3xl mx-auto space-y-5">
        {/* Back */}
        <button onClick={() => router.back()} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
          ← Back
        </button>

        {/* Header card */}
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={statusBadge(instance.status)}>{instance.status.replace('_', ' ')}</Badge>
                  <span className="text-xs font-mono text-gray-400">{instance.referenceNumber}</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">{instance.title}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {instance.submittedAt
                    ? `Submitted ${new Date(instance.submittedAt).toLocaleString()}`
                    : `Created ${new Date(instance.createdAt).toLocaleString()}`}
                </p>
              </div>
              {canCancel && (
                <Button size="sm" variant="danger" loading={cancelling} onClick={handleCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Form data */}
        {instance.formData && Object.keys(instance.formData).length > 0 && (
          <Card>
            <CardHeader><CardTitle>Form Data</CardTitle></CardHeader>
            <CardContent>
              <dl className="divide-y divide-gray-100">
                {Object.entries(instance.formData).map(([key, value]) => (
                  <div key={key} className="py-2.5 grid grid-cols-3 gap-4">
                    <dt className="text-sm font-medium text-gray-500 capitalize">{key.replace(/_/g, ' ')}</dt>
                    <dd className="col-span-2 text-sm text-gray-900">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        )}

        {/* Tasks */}
        {instance.tasks && instance.tasks.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Task History</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-gray-100">
                {instance.tasks.map((task) => (
                  <li key={task.id} className="px-6 py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusBadge(task.status)}>{task.status.replace('_', ' ')}</Badge>
                        {task.actionTaken && (
                          <Badge variant={statusBadge(task.actionTaken)}>{task.actionTaken}</Badge>
                        )}
                      </div>
                      {task.notes && <p className="text-xs text-gray-500 mt-1 italic">"{task.notes}"</p>}
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {task.completedAt
                        ? new Date(task.completedAt).toLocaleString()
                        : new Date(task.createdAt).toLocaleString()}
                    </span>
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
                {approvals.map((a) => (
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

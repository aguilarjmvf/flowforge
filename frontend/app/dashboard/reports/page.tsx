'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, statusBadge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import type { ApiResponse, DashboardMetrics, WorkflowInstance } from '@/types';

interface DeptStats {
  deptId: string;
  completed: number;
  pending: number;
}

export default function ReportsPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [depts, setDepts] = useState<DeptStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<ApiResponse<DashboardMetrics>>('/reports/dashboard'),
      api.get<ApiResponse<WorkflowInstance[]>>('/instances'),
      api.get<ApiResponse<Record<string, { completed: number; pending: number }>>>('/reports/departments'),
    ])
      .then(([m, i, d]) => {
        setMetrics(m.data ?? null);
        setInstances(Array.isArray(i.data) ? i.data : []);
        const deptObj = d.data ?? {};
        setDepts(
          Object.entries(deptObj).map(([id, stats]) => ({ deptId: id, ...stats }))
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Header title="Reports" />
      <div className="p-6 max-w-6xl mx-auto space-y-8">
        {/* Summary metrics */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Overview</h2>
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <Card key={i}><CardContent className="h-20 animate-pulse bg-gray-50" /></Card>)}
            </div>
          ) : metrics ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Requests" value={metrics.instances.total} color="text-gray-900" />
              <StatCard label="Completed" value={metrics.instances.completed} color="text-green-600" />
              <StatCard label="Rejected" value={metrics.instances.rejected} color="text-red-600" />
              <StatCard
                label="Avg Completion"
                value={metrics.avgCompletionHours !== null ? `${metrics.avgCompletionHours}h` : '—'}
                color="text-blue-600"
              />
            </div>
          ) : (
            <p className="text-sm text-gray-500">Could not load metrics.</p>
          )}
        </section>

        {/* Department activity */}
        {depts.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Department Activity</h2>
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Department</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Completed</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Pending</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {depts.map((d, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900 capitalize">
                          {d.deptId === 'unassigned' ? 'Unassigned' : d.deptId}
                        </td>
                        <td className="px-4 py-3 text-right text-green-700 font-medium">{d.completed}</td>
                        <td className="px-4 py-3 text-right text-yellow-700 font-medium">{d.pending}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>
        )}

        {/* All requests */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">All Requests</h2>
          {loading ? (
            <Card><CardContent className="h-40 animate-pulse bg-gray-50" /></Card>
          ) : instances.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-gray-500 text-sm">No requests found.</CardContent>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Reference</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Submitted</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Completed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {instances.map((inst) => (
                      <tr key={inst.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{inst.referenceNumber}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{inst.title}</td>
                        <td className="px-4 py-3">
                          <Badge variant={statusBadge(inst.status)}>{inst.status.replace('_', ' ')}</Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {inst.submittedAt ? new Date(inst.submittedAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {inst.completedAt ? new Date(inst.completedAt).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

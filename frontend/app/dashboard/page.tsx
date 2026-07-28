'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import type { ApiResponse, DashboardMetrics } from '@/types';

function MetricCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ApiResponse<DashboardMetrics>>('/reports/dashboard')
      .then((res) => setMetrics(res.data ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Welcome back, {user?.firstName}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Here's what's happening in your workflows.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i}><CardContent className="pt-6 h-24 animate-pulse bg-gray-50" /></Card>
            ))}
          </div>
        ) : metrics ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <MetricCard label="Active Requests" value={metrics.instances.active} color="text-blue-600" />
              <MetricCard label="Pending Tasks" value={metrics.tasks.pending} color="text-yellow-600" />
              <MetricCard label="Completed" value={metrics.instances.completed} color="text-green-600" />
              <MetricCard label="Rejected" value={metrics.instances.rejected} color="text-red-600" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Draft Requests" value={metrics.instances.draft} color="text-gray-600" />
              <MetricCard label="Published Workflows" value={metrics.workflows.published} color="text-indigo-600" />
              <MetricCard label="Total Requests" value={metrics.instances.total} color="text-gray-700" />
              <MetricCard
                label="Avg. Completion"
                value={metrics.avgCompletionHours !== null ? `${metrics.avgCompletionHours}h` : '—'}
                sub="average hours to complete"
                color="text-gray-700"
              />
            </div>
          </>
        ) : (
          <p className="text-gray-500 text-sm">Could not load metrics.</p>
        )}
      </div>
    </div>
  );
}

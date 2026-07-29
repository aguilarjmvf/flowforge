'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, statusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import type { ApiResponse, WorkflowInstance } from '@/types';

export default function RequestsPage() {
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? instances.filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.referenceNumber.toLowerCase().includes(q) ||
      i.status.toLowerCase().includes(q)
    ) : instances;
  }, [instances, search]);

  useEffect(() => {
    api.get<ApiResponse<WorkflowInstance[]>>('/instances?mine=true')
      .then((res) => setInstances(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Header title="My Requests" />
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-500">{filtered.length} of {instances.length} request{instances.length !== 1 ? 's' : ''}</p>
          <Link href="/dashboard/requests/new">
            <Button size="sm">+ New Request</Button>
          </Link>
        </div>
        <input
          type="text"
          placeholder="Search by title, reference number, or status…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full mb-4 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Card key={i}><CardContent className="h-20 animate-pulse bg-gray-50" /></Card>)}
          </div>
        ) : instances.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-4xl mb-3">📄</p>
              <p className="text-gray-500 font-medium">No requests yet</p>
              <p className="text-sm text-gray-400 mt-1">Start a new workflow request.</p>
              <Link href="/dashboard/requests/new">
                <Button className="mt-4">Create Request</Button>
              </Link>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-gray-400 text-sm">No requests match "{search}"</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((instance) => (
              <Link key={instance.id} href={`/dashboard/requests/${instance.id}`}>
                <Card className="hover:border-blue-300 transition-colors cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={statusBadge(instance.status)}>
                            {instance.status.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs font-mono text-gray-400">{instance.referenceNumber}</span>
                        </div>
                        <p className="font-medium text-gray-900 truncate">{instance.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {instance.submittedAt
                            ? `Submitted ${new Date(instance.submittedAt).toLocaleDateString()}`
                            : `Created ${new Date(instance.createdAt).toLocaleDateString()}`}
                        </p>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

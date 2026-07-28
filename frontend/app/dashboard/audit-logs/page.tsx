'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';
import type { ApiResponse, AuditLog } from '@/types';

const ACTION_COLORS: Record<string, string> = {
  'instance.created': 'bg-blue-100 text-blue-700',
  'instance.submitted': 'bg-indigo-100 text-indigo-700',
  'instance.approved': 'bg-green-100 text-green-700',
  'instance.rejected': 'bg-red-100 text-red-700',
  'instance.returned': 'bg-yellow-100 text-yellow-700',
  'instance.completed': 'bg-green-100 text-green-700',
  'instance.cancelled': 'bg-gray-100 text-gray-600',
  'auth.login': 'bg-purple-100 text-purple-700',
  'auth.logout': 'bg-gray-100 text-gray-600',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get<ApiResponse<AuditLog[]>>('/audit-logs')
      .then((res) => setLogs(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? logs.filter((l) =>
        l.action.includes(search) ||
        l.entityType?.includes(search) ||
        l.user?.email.includes(search) ||
        l.user?.firstName.toLowerCase().includes(search.toLowerCase()) ||
        l.user?.lastName.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  return (
    <div>
      <Header title="Audit Logs" />
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, entity type, or user..."
            className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {loading ? (
          <Card>
            <div className="h-64 animate-pulse bg-gray-50 rounded-lg" />
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <div className="py-12 text-center">
              <p className="text-4xl mb-3">📜</p>
              <p className="text-gray-500 font-medium">{search ? 'No matching logs' : 'No audit logs yet'}</p>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Timestamp</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Entity</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((log) => {
                    const colorClass = ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600';
                    return (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {log.user
                            ? <span>{log.user.firstName} {log.user.lastName}<br /><span className="text-gray-400 text-xs">{log.user.email}</span></span>
                            : <span className="text-gray-400">System</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {log.entityType && (
                            <span className="font-mono text-xs">{log.entityType}</span>
                          )}
                          {log.entityId && (
                            <span className="text-gray-400 font-mono text-xs block">{log.entityId.slice(0, 8)}…</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs font-mono">{log.ipAddress ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

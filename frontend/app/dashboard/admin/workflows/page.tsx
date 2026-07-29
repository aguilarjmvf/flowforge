'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, statusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { api } from '@/lib/api';
import type { Workflow } from '@/types';

export default function WorkflowsAdminPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const filteredWorkflows = useMemo(() => {
    const q = search.toLowerCase();
    return q ? workflows.filter(w =>
      w.name.toLowerCase().includes(q) ||
      (w.description ?? '').toLowerCase().includes(q) ||
      w.status.toLowerCase().includes(q)
    ) : workflows;
  }, [workflows, search]);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    api.get<import('@/types').ApiResponse<Workflow[]>>('/workflows')
      .then((res) => setWorkflows(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setCreating(true);
    setError('');
    try {
      await api.post('/workflows', { name: form.name.trim(), description: form.description.trim() || undefined });
      setShowCreate(false);
      setForm({ name: '', description: '' });
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create workflow');
    } finally {
      setCreating(false);
    }
  }

  async function handlePublish(id: string) {
    try {
      await api.post(`/workflows/${id}/publish`, {});
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to publish workflow.');
    }
  }

  async function handleArchive(id: string) {
    try {
      await api.post(`/workflows/${id}/archive`, {});
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to archive workflow.');
    }
  }

  return (
    <div>
      <Header title="Workflows" />
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-500">{filteredWorkflows.length} of {workflows.length} workflow{workflows.length !== 1 ? 's' : ''}</p>
          <Button size="sm" onClick={() => setShowCreate(true)}>+ New Workflow</Button>
        </div>
        <input
          type="text"
          placeholder="Search by name, description, or status…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full mb-4 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Card key={i}><CardContent className="h-20 animate-pulse bg-gray-50" /></Card>)}
          </div>
        ) : workflows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-4xl mb-3">⚙️</p>
              <p className="text-gray-500 font-medium">No workflows yet</p>
              <p className="text-sm text-gray-400 mt-1">Create your first workflow to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredWorkflows.map((w) => (
              <Card key={w.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={statusBadge(w.status)}>{w.status}</Badge>
                      </div>
                      <p className="font-medium text-gray-900">{w.name}</p>
                      {w.description && <p className="text-sm text-gray-400 mt-0.5 truncate">{w.description}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">Created {new Date(w.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/dashboard/admin/workflows/${w.id}`}>
                        <Button size="sm" variant="outline">Configure</Button>
                      </Link>
                      {w.status === 'draft' && (
                        <Button size="sm" variant="success" onClick={() => handlePublish(w.id)}>Publish</Button>
                      )}
                      {w.status === 'published' && (
                        <Button size="sm" variant="secondary" onClick={() => handleArchive(w.id)}>Archive</Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <Modal title="Create Workflow" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Leave Request"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of this workflow..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button loading={creating} onClick={handleCreate}>Create</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

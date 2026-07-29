'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { api } from '@/lib/api';
import type { ApiResponse, Form, Workflow } from '@/types';

export default function FormsAdminPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', workflowId: '' });
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    Promise.all([
      api.get<ApiResponse<Form[]>>('/forms'),
      api.get<ApiResponse<Workflow[]>>('/workflows'),
    ])
      .then(([formsRes, wfRes]) => {
        setForms(formsRes.data ?? []);
        setWorkflows((wfRes.data ?? []).filter((w) => w.status === 'published' || w.status === 'draft'));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setCreating(true);
    setError('');
    try {
      await api.post('/forms', {
        name: form.name.trim(),
        workflowId: form.workflowId || undefined,
      });
      setShowCreate(false);
      setForm({ name: '', workflowId: '' });
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create form');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <Header title="Forms" />
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-5">
          <p className="text-sm text-gray-500">{forms.length} form{forms.length !== 1 ? 's' : ''}</p>
          <Button size="sm" onClick={() => setShowCreate(true)}>+ New Form</Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Card key={i}><CardContent className="h-20 animate-pulse bg-gray-50" /></Card>)}
          </div>
        ) : forms.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-gray-500 font-medium">No forms yet</p>
              <p className="text-sm text-gray-400 mt-1">Create a form to attach to a workflow.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {forms.map((f) => {
              const linked = workflows.find((w) => w.id === f.workflowId);
              return (
                <Card key={f.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{f.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {linked ? `Linked to: ${linked.name}` : 'Not linked to a workflow'}
                        </p>
                      </div>
                      <Link href={`/dashboard/admin/forms/${f.id}`}>
                        <Button size="sm" variant="outline">Edit Fields</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <Modal title="Create Form" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Form Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Leave Request Form"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link to Workflow</label>
              <select
                value={form.workflowId}
                onChange={(e) => setForm((f) => ({ ...f, workflowId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— None —</option>
                {workflows.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
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

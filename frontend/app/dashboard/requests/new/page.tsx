'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import type { ApiResponse, Workflow, Form, FormField } from '@/types';

export default function NewRequestPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState('');
  const [selectedForm, setSelectedForm] = useState('');
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [title, setTitle] = useState('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<ApiResponse<Workflow[]>>('/workflows?status=published'),
      api.get<ApiResponse<Form[]>>('/forms'),
    ]).then(([wf, fm]) => {
      setWorkflows(wf.data ?? []);
      setForms(fm.data ?? []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedForm) { setFormFields([]); return; }
    api.get<ApiResponse<Form>>(`/forms/${selectedForm}`)
      .then((res) => setFormFields(res.data?.fields ?? []))
      .catch(() => {});
  }, [selectedForm]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedWorkflow || !title) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post<ApiResponse<{ id: string }>>('/instances', {
        workflowId: selectedWorkflow,
        formId: selectedForm || undefined,
        title,
        formData,
      });
      const instanceId = res.data?.id;
      if (!instanceId) throw new Error('Failed to create request');

      // Auto-submit
      await api.post(`/instances/${instanceId}/submit`);
      router.push(`/dashboard/requests/${instanceId}`);
    } catch (err: any) {
      setError(err.message ?? 'Failed to create request');
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Header title="New Request" />
      <div className="p-6 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Request Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Workflow *</label>
                <select
                  value={selectedWorkflow}
                  onChange={(e) => setSelectedWorkflow(e.target.value)}
                  required
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a workflow…</option>
                  {workflows.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Form (optional)</label>
                <select
                  value={selectedForm}
                  onChange={(e) => setSelectedForm(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No form</option>
                  {forms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>

              <Input
                id="title"
                label="Request Title *"
                placeholder="e.g. Purchase Request for Office Supplies"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </CardContent>
          </Card>

          {formFields.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Form Data</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {formFields.map((field) => (
                  <div key={field.id}>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      {field.label}{field.isRequired && ' *'}
                    </label>
                    {field.fieldType === 'long_text' ? (
                      <textarea
                        rows={3}
                        required={field.isRequired}
                        placeholder={field.defaultValue ?? ''}
                        value={formData[field.fieldKey] ?? ''}
                        onChange={(e) => setFormData((p) => ({ ...p, [field.fieldKey]: e.target.value }))}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : field.fieldType === 'dropdown' && Array.isArray(field.options) ? (
                      <select
                        required={field.isRequired}
                        value={formData[field.fieldKey] ?? ''}
                        onChange={(e) => setFormData((p) => ({ ...p, [field.fieldKey]: e.target.value }))}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select…</option>
                        {(field.options as string[]).map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type={field.fieldType === 'number' || field.fieldType === 'currency' ? 'number' : field.fieldType === 'date' ? 'date' : 'text'}
                        required={field.isRequired}
                        placeholder={field.defaultValue ?? ''}
                        value={formData[field.fieldKey] ?? ''}
                        onChange={(e) => setFormData((p) => ({ ...p, [field.fieldKey]: e.target.value }))}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" loading={submitting}>Submit Request</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

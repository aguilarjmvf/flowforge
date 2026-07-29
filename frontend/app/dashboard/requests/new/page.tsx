'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import type { ApiResponse, Workflow, Form, FormField, FormFieldOption } from '@/types';

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: string;
  onChange: (val: string) => void;
}) {
  const options = (field.options ?? []) as FormFieldOption[];
  const cls =
    'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500';

  switch (field.fieldType) {
    case 'long_text':
      return (
        <textarea rows={3} required={field.isRequired}
          placeholder={field.placeholder ?? ''} value={value}
          onChange={e => onChange(e.target.value)} className={cls} />
      );

    case 'dropdown':
      return (
        <select required={field.isRequired} value={value}
          onChange={e => onChange(e.target.value)} className={cls}>
          <option value="">Select…</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );

    case 'radio':
      return (
        <div className="space-y-1.5 mt-1">
          {options.map(o => (
            <label key={o.value} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name={field.fieldKey} value={o.value}
                checked={value === o.value} onChange={() => onChange(o.value)} />
              {o.label}
            </label>
          ))}
        </div>
      );

    case 'checkbox': {
      const selected = value ? value.split(',') : [];
      return (
        <div className="space-y-1.5 mt-1">
          {options.map(o => (
            <label key={o.value} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={selected.includes(o.value)}
                onChange={() => {
                  const next = selected.includes(o.value)
                    ? selected.filter(v => v !== o.value)
                    : [...selected, o.value];
                  onChange(next.join(','));
                }} />
              {o.label}
            </label>
          ))}
        </div>
      );
    }

    case 'number':
    case 'currency':
      return <input type="number" required={field.isRequired}
        placeholder={field.placeholder ?? ''} value={value}
        onChange={e => onChange(e.target.value)} className={cls} />;

    case 'date':
      return <input type="date" required={field.isRequired} value={value}
        onChange={e => onChange(e.target.value)} className={cls} />;

    case 'datetime':
      return <input type="datetime-local" required={field.isRequired} value={value}
        onChange={e => onChange(e.target.value)} className={cls} />;

    default:
      return <input type="text" required={field.isRequired}
        placeholder={field.placeholder ?? ''} value={value}
        onChange={e => onChange(e.target.value)} className={cls} />;
  }
}

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

  // auto-select linked form when workflow changes
  useEffect(() => {
    if (!selectedWorkflow) return;
    const linked = forms.find(f => f.workflowId === selectedWorkflow);
    if (linked) setSelectedForm(linked.id);
  }, [selectedWorkflow, forms]);

  // load fields when form changes
  useEffect(() => {
    if (!selectedForm) { setFormFields([]); setFormData({}); return; }
    api.get<ApiResponse<Form>>(`/forms/${selectedForm}`)
      .then(res => {
        const fields = (res.data?.fields ?? []).sort((a, b) => a.displayOrder - b.displayOrder);
        setFormFields(fields);
        const defaults: Record<string, string> = {};
        fields.forEach(f => { if (f.defaultValue) defaults[f.fieldKey] = f.defaultValue; });
        setFormData(defaults);
      })
      .catch(() => {});
  }, [selectedForm]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedWorkflow || !title.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post<ApiResponse<{ id: string }>>('/instances', {
        workflowId: selectedWorkflow,
        formId: selectedForm || undefined,
        title: title.trim(),
        formData,
      });
      const instanceId = res.data?.id;
      if (!instanceId) throw new Error('Failed to create request');
      await api.post(`/instances/${instanceId}/submit`);
      router.push(`/dashboard/requests/${instanceId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
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
                <select value={selectedWorkflow} onChange={e => setSelectedWorkflow(e.target.value)} required
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">Select a workflow…</option>
                  {workflows.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Form</label>
                <select value={selectedForm} onChange={e => setSelectedForm(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">No form</option>
                  {forms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>

              <Input label="Request Title *" placeholder="e.g. Purchase Request for Office Supplies"
                value={title} onChange={e => setTitle(e.target.value)} required />
            </CardContent>
          </Card>

          {formFields.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Form</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {formFields.map(field => (
                  <div key={field.id}>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      {field.label}
                      {field.isRequired && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    <FieldInput field={field} value={formData[field.fieldKey] ?? ''}
                      onChange={val => setFormData(p => ({ ...p, [field.fieldKey]: val }))} />
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

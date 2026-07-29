'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ApiResponse, Form, FormField, FormFieldType, FormFieldOption } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// ─── constants ────────────────────────────────────────────────────────────────

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'long_text', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Date & Time' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'radio', label: 'Radio' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'file_upload', label: 'File Upload' },
  { value: 'user_select', label: 'User Select' },
  { value: 'department_select', label: 'Department Select' },
];

const HAS_OPTIONS: FormFieldType[] = ['dropdown', 'radio', 'checkbox'];

function fieldTypeLabel(type: string) {
  return FIELD_TYPES.find(f => f.value === type)?.label ?? type;
}

function toSnakeCase(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

// ─── field form state ─────────────────────────────────────────────────────────

interface FieldForm {
  label: string;
  fieldKey: string;
  fieldType: FormFieldType;
  placeholder: string;
  defaultValue: string;
  isRequired: boolean;
  options: FormFieldOption[];
}

const emptyFieldForm = (): FieldForm => ({
  label: '',
  fieldKey: '',
  fieldType: 'text',
  placeholder: '',
  defaultValue: '',
  isRequired: false,
  options: [],
});

// ─── component ────────────────────────────────────────────────────────────────

export default function FormEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // field modal
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [fieldForm, setFieldForm] = useState<FieldForm>(emptyFieldForm());
  const [fieldSaving, setFieldSaving] = useState(false);
  const [fieldError, setFieldError] = useState('');

  // options editor inside modal
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [newOptionValue, setNewOptionValue] = useState('');

  // delete confirm
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null);

  // reorder state
  const [reordering, setReordering] = useState(false);

  const loadForm = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<Form>>(`/forms/${id}`);
      if (res.success && res.data) {
        const f = res.data;
        if (f.fields) f.fields.sort((a, b) => a.displayOrder - b.displayOrder);
        setForm(f);
      }
    } catch {
      setError('Failed to load form.');
    }
  }, [id]);

  useEffect(() => {
    loadForm().finally(() => setLoading(false));
  }, [loadForm]);

  // ── field helpers ─────────────────────────────────────────────────────────

  function openAddField() {
    setEditingField(null);
    setFieldForm(emptyFieldForm());
    setFieldError('');
    setNewOptionLabel('');
    setNewOptionValue('');
    setFieldModalOpen(true);
  }

  function openEditField(field: FormField) {
    setEditingField(field);
    setFieldForm({
      label: field.label,
      fieldKey: field.fieldKey,
      fieldType: field.fieldType,
      placeholder: field.placeholder ?? '',
      defaultValue: field.defaultValue ?? '',
      isRequired: field.isRequired,
      options: field.options ? [...field.options] : [],
    });
    setFieldError('');
    setNewOptionLabel('');
    setNewOptionValue('');
    setFieldModalOpen(true);
  }

  function handleLabelChange(value: string) {
    setFieldForm(f => ({
      ...f,
      label: value,
      // auto-derive fieldKey from label only when creating and user hasn't manually edited it
      fieldKey: editingField ? f.fieldKey : toSnakeCase(value),
    }));
  }

  function addOption() {
    const label = newOptionLabel.trim();
    const value = newOptionValue.trim() || toSnakeCase(newOptionLabel);
    if (!label) return;
    setFieldForm(f => ({ ...f, options: [...f.options, { label, value }] }));
    setNewOptionLabel('');
    setNewOptionValue('');
  }

  function removeOption(idx: number) {
    setFieldForm(f => ({ ...f, options: f.options.filter((_, i) => i !== idx) }));
  }

  async function saveField() {
    if (!fieldForm.label.trim()) { setFieldError('Label is required.'); return; }
    if (!fieldForm.fieldKey.trim()) { setFieldError('Field key is required.'); return; }
    if (HAS_OPTIONS.includes(fieldForm.fieldType) && fieldForm.options.length === 0) {
      setFieldError('At least one option is required for this field type.');
      return;
    }
    setFieldSaving(true);
    setFieldError('');
    const body: Record<string, unknown> = {
      label: fieldForm.label.trim(),
      fieldKey: fieldForm.fieldKey.trim(),
      fieldType: fieldForm.fieldType,
      placeholder: fieldForm.placeholder.trim() || undefined,
      defaultValue: fieldForm.defaultValue.trim() || undefined,
      isRequired: fieldForm.isRequired,
      options: HAS_OPTIONS.includes(fieldForm.fieldType) ? fieldForm.options : undefined,
    };
    if (!editingField) {
      body.displayOrder = (form?.fields?.length ?? 0);
    }
    try {
      if (editingField) {
        await api.patch(`/forms/${id}/fields/${editingField.id}`, body);
      } else {
        await api.post(`/forms/${id}/fields`, body);
      }
      await loadForm();
      setFieldModalOpen(false);
    } catch (e: unknown) {
      setFieldError(e instanceof Error ? e.message : 'Failed to save field.');
    } finally {
      setFieldSaving(false);
    }
  }

  async function deleteField(fieldId: string) {
    try {
      await api.delete(`/forms/${id}/fields/${fieldId}`);
      await loadForm();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to delete field.');
    } finally {
      setDeletingFieldId(null);
    }
  }

  async function moveField(fieldId: string, direction: 'up' | 'down') {
    if (!form?.fields) return;
    const fields = [...form.fields];
    const idx = fields.findIndex(f => f.id === fieldId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= fields.length) return;

    [fields[idx], fields[swapIdx]] = [fields[swapIdx], fields[idx]];
    const reorderBody = {
      fields: fields.map((f, i) => ({ id: f.id, displayOrder: i })),
    };
    setReordering(true);
    try {
      await api.patch(`/forms/${id}/fields/reorder`, reorderBody);
      await loadForm();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to reorder fields.');
    } finally {
      setReordering(false);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  if (loading) return <div className="p-8 text-gray-500">Loading form...</div>;

  if (error || !form) {
    return (
      <div className="p-8">
        <p className="text-red-600 mb-4">{error || 'Form not found.'}</p>
        <Button variant="secondary" onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  const fields = form.fields ?? [];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{form.name}</h1>
          {form.description && <p className="text-sm text-gray-500 mt-0.5">{form.description}</p>}
        </div>
      </div>

      {/* Fields */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Fields ({fields.length})</CardTitle>
            <Button size="sm" onClick={openAddField}>Add Field</Button>
          </div>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No fields yet. Add your first field above.</p>
          ) : (
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={field.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                  {/* reorder arrows */}
                  <div className="flex flex-col gap-0.5 flex-shrink-0 pt-0.5">
                    <button
                      disabled={idx === 0 || reordering}
                      onClick={() => moveField(field.id, 'up')}
                      className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      disabled={idx === fields.length - 1 || reordering}
                      onClick={() => moveField(field.id, 'down')}
                      className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">{field.label}</span>
                      <span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-100">
                        {fieldTypeLabel(field.fieldType)}
                      </span>
                      {field.isRequired && (
                        <span className="px-2 py-0.5 rounded text-xs bg-red-50 text-red-700 border border-red-100">Required</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">{field.fieldKey}</p>
                    {field.options && Array.isArray(field.options) && field.options.length > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Options: {field.options.map(o => o.label).join(', ')}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => openEditField(field)}>Edit</Button>
                    {deletingFieldId === field.id ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="danger" onClick={() => deleteField(field.id)}>Confirm</Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeletingFieldId(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setDeletingFieldId(field.id)}>
                        <span className="text-red-500">Delete</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Field Modal */}
      {fieldModalOpen && (
        <Modal title={editingField ? 'Edit Field' : 'Add Field'} onClose={() => setFieldModalOpen(false)} className="max-w-lg">
          <div className="space-y-4">
            <Input
              label="Label *"
              value={fieldForm.label}
              onChange={e => handleLabelChange(e.target.value)}
              placeholder="e.g. Project Description"
            />
            <Input
              label="Field Key *"
              value={fieldForm.fieldKey}
              onChange={e => setFieldForm(f => ({ ...f, fieldKey: e.target.value }))}
              placeholder="e.g. project_description"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Field Type *</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={fieldForm.fieldType}
                onChange={e => setFieldForm(f => ({ ...f, fieldType: e.target.value as FormFieldType, options: [] }))}
              >
                {FIELD_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={fieldForm.isRequired}
                onChange={e => setFieldForm(f => ({ ...f, isRequired: e.target.checked }))}
                className="rounded"
              />
              Required field
            </label>
            <Input
              label="Placeholder"
              value={fieldForm.placeholder}
              onChange={e => setFieldForm(f => ({ ...f, placeholder: e.target.value }))}
              placeholder="Optional placeholder text"
            />
            <Input
              label="Default Value"
              value={fieldForm.defaultValue}
              onChange={e => setFieldForm(f => ({ ...f, defaultValue: e.target.value }))}
              placeholder="Optional default value"
            />

            {/* Options editor for dropdown/radio/checkbox */}
            {HAS_OPTIONS.includes(fieldForm.fieldType) && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Options *</p>
                {fieldForm.options.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {fieldForm.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm bg-gray-50 px-3 py-1.5 rounded border border-gray-100">
                        <span>{opt.label} <span className="text-gray-400 font-mono text-xs">({opt.value})</span></span>
                        <button onClick={() => removeOption(idx)} className="text-red-400 hover:text-red-600 ml-2">×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Option label"
                    value={newOptionLabel}
                    onChange={e => setNewOptionLabel(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addOption()}
                  />
                  <input
                    className="w-32 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Value (auto)"
                    value={newOptionValue}
                    onChange={e => setNewOptionValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addOption()}
                  />
                  <Button size="sm" variant="secondary" onClick={addOption} type="button">Add</Button>
                </div>
              </div>
            )}

            {fieldError && <p className="text-sm text-red-600">{fieldError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setFieldModalOpen(false)}>Cancel</Button>
              <Button onClick={saveField} loading={fieldSaving}>
                {editingField ? 'Save Changes' : 'Add Field'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

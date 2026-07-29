'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { api } from '@/lib/api';
import type { ApiResponse, Role, Permission, RolePermission } from '@/types';

export default function RolesAdminPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  // create modal
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [createError, setCreateError] = useState('');

  // permissions modal
  const [permRole, setPermRole] = useState<Role | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set());
  const [permSaving, setPermSaving] = useState(false);
  const [permError, setPermError] = useState('');
  const [permLoading, setPermLoading] = useState(false);

  function loadRoles() {
    setLoading(true);
    api.get<ApiResponse<Role[]>>('/roles')
      .then(res => setRoles(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadRoles();
    api.get<ApiResponse<Permission[]>>('/permissions').then(res => setAllPermissions(res.data ?? []));
  }, []);

  async function handleCreate() {
    if (!form.name.trim()) { setCreateError('Name is required.'); return; }
    setCreating(true);
    setCreateError('');
    try {
      await api.post('/roles', {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      });
      setShowCreate(false);
      setForm({ name: '', description: '' });
      loadRoles();
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create role');
    } finally {
      setCreating(false);
    }
  }

  async function openPermissions(role: Role) {
    setPermRole(role);
    setPermError('');
    setPermLoading(true);
    try {
      const res = await api.get<ApiResponse<RolePermission[]>>(`/roles/${role.id}/permissions`);
      const current = new Set((res.data ?? []).map(rp => rp.permission.id));
      setSelectedPermIds(current);
    } catch {
      setSelectedPermIds(new Set());
    } finally {
      setPermLoading(false);
    }
  }

  function togglePerm(permId: string) {
    setSelectedPermIds(prev => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  }

  async function savePermissions() {
    if (!permRole) return;
    setPermSaving(true);
    setPermError('');
    try {
      await api.post(`/roles/${permRole.id}/permissions`, {
        permissionIds: Array.from(selectedPermIds),
      });
      setPermRole(null);
    } catch (e: unknown) {
      setPermError(e instanceof Error ? e.message : 'Failed to save permissions');
    } finally {
      setPermSaving(false);
    }
  }

  // group permissions by module
  const permissionsByModule = allPermissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  return (
    <div>
      <Header title="Roles" />
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-5">
          <p className="text-sm text-gray-500">{roles.length} role{roles.length !== 1 ? 's' : ''}</p>
          <Button size="sm" onClick={() => setShowCreate(true)}>+ New Role</Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Card key={i}><CardContent className="h-16 animate-pulse bg-gray-50" /></Card>)}
          </div>
        ) : roles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-4xl mb-3">🏷️</p>
              <p className="text-gray-500 font-medium">No roles defined</p>
              <p className="text-sm text-gray-400 mt-1">Create roles to assign to users and workflow steps.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {roles.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {r.name}
                      {r.isSystem && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">System</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{r.description ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => openPermissions(r)}>
                        Permissions
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Role Modal */}
      {showCreate && (
        <Modal title="Create Role" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Department Manager"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of this role..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {createError && <p className="text-sm text-red-600">{createError}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button loading={creating} onClick={handleCreate}>Create</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Permissions Modal */}
      {permRole && (
        <Modal
          title={`Permissions — ${permRole.name}`}
          onClose={() => setPermRole(null)}
          className="max-w-lg"
        >
          {permLoading ? (
            <div className="py-8 text-center text-sm text-gray-400">Loading permissions...</div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Select the permissions this role grants. Changes replace all existing assignments.
              </p>
              <div className="max-h-96 overflow-y-auto space-y-4 pr-1">
                {Object.entries(permissionsByModule).sort().map(([module, perms]) => (
                  <div key={module}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{module}</p>
                    <div className="space-y-1.5">
                      {perms.map(p => (
                        <label key={p.id} className="flex items-start gap-2.5 cursor-pointer group">
                          <input
                            type="checkbox"
                            className="mt-0.5 rounded"
                            checked={selectedPermIds.has(p.id)}
                            onChange={() => togglePerm(p.id)}
                          />
                          <div>
                            <span className="text-sm font-medium text-gray-800 group-hover:text-blue-600">{p.name}</span>
                            {p.description && (
                              <p className="text-xs text-gray-400">{p.description}</p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {permError && <p className="text-sm text-red-600">{permError}</p>}
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-gray-500">{selectedPermIds.size} permission{selectedPermIds.size !== 1 ? 's' : ''} selected</span>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setPermRole(null)}>Cancel</Button>
                  <Button onClick={savePermissions} loading={permSaving}>Save Permissions</Button>
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { api } from '@/lib/api';
import type { ApiResponse, UserDetail, Role, Department } from '@/types';

export default function UsersAdminPage() {
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return q ? users.filter(u =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    ) : users;
  }, [users, search]);

  // create modal
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [createError, setCreateError] = useState('');

  // manage modal
  const [managingUser, setManagingUser] = useState<UserDetail | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [manageSaving, setManageSaving] = useState(false);
  const [manageError, setManageError] = useState('');
  const [manageLoading, setManageLoading] = useState(false);

  function loadUsers() {
    setLoading(true);
    api.get<ApiResponse<UserDetail[]>>('/users')
      .then(res => setUsers(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadUsers();
    api.get<ApiResponse<Role[]>>('/roles').then(res => setRoles(res.data ?? []));
    api.get<ApiResponse<Department[]>>('/departments').then(res => setDepartments(res.data ?? []));
  }, []);

  async function handleCreate() {
    if (!createForm.firstName.trim() || !createForm.lastName.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      setCreateError('All fields are required.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      await api.post('/users', {
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
      });
      setShowCreate(false);
      setCreateForm({ firstName: '', lastName: '', email: '', password: '' });
      loadUsers();
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create user');
    } finally {
      setCreating(false);
    }
  }

  async function openManage(user: UserDetail) {
    setManagingUser(user);
    setManageError('');
    setSelectedDeptId(user.departmentId ?? '');
    setManageLoading(true);
    try {
      // Fetch user's current roles via their detail — backend returns roles on the user object
      // We re-fetch the user to get latest departmentId too
      const res = await api.get<ApiResponse<UserDetail & { roles?: { id: string }[] }>>(`/users/${user.id}`);
      const detail = res.data;
      const currentRoleIds = new Set<string>((detail?.roles ?? []).map((r: { id: string }) => r.id));
      setSelectedRoleIds(currentRoleIds);
      if (detail?.departmentId != null) setSelectedDeptId(detail.departmentId);
    } catch {
      setSelectedRoleIds(new Set());
    } finally {
      setManageLoading(false);
    }
  }

  function toggleRole(roleId: string) {
    setSelectedRoleIds(prev => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  }

  async function saveManage() {
    if (!managingUser) return;
    setManageSaving(true);
    setManageError('');
    try {
      await Promise.all([
        api.patch(`/users/${managingUser.id}`, {
          departmentId: selectedDeptId || null,
        }),
        api.post(`/users/${managingUser.id}/roles`, {
          roleIds: Array.from(selectedRoleIds),
        }),
      ]);
      loadUsers();
      setManagingUser(null);
    } catch (e: unknown) {
      setManageError(e instanceof Error ? e.message : 'Failed to save changes');
    } finally {
      setManageSaving(false);
    }
  }

  return (
    <div>
      <Header title="Users" />
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-500">{filteredUsers.length} of {users.length} user{users.length !== 1 ? 's' : ''}</p>
          <Button size="sm" onClick={() => setShowCreate(true)}>+ Invite User</Button>
        </div>
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full mb-4 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Card key={i}><CardContent className="h-16 animate-pulse bg-gray-50" /></Card>)}
          </div>
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-4xl mb-3">👤</p>
              <p className="text-gray-500 font-medium">No users found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <span className="font-medium text-gray-900">{u.firstName} {u.lastName}</span>
                        {u.isSuperAdmin && <Badge variant="info">Admin</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.isActive ? 'success' : 'muted'}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => openManage(u)}>
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <Modal title="Invite User" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
              <input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {createError && <p className="text-sm text-red-600">{createError}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button loading={creating} onClick={handleCreate}>Create User</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Manage User Modal */}
      {managingUser && (
        <Modal
          title={`Manage — ${managingUser.firstName} ${managingUser.lastName}`}
          onClose={() => setManagingUser(null)}
          className="max-w-lg"
        >
          {manageLoading ? (
            <div className="py-8 text-center text-sm text-gray-400">Loading...</div>
          ) : (
            <div className="space-y-5">
              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedDeptId}
                  onChange={e => setSelectedDeptId(e.target.value)}
                >
                  <option value="">— No department —</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Roles */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Roles</p>
                {roles.length === 0 ? (
                  <p className="text-sm text-gray-400">No roles available.</p>
                ) : (
                  <div className="max-h-56 overflow-y-auto space-y-1.5 border border-gray-200 rounded-lg p-3">
                    {roles.map(r => (
                      <label key={r.id} className="flex items-center gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={selectedRoleIds.has(r.id)}
                          onChange={() => toggleRole(r.id)}
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-800 group-hover:text-blue-600">{r.name}</span>
                          {r.description && <p className="text-xs text-gray-400">{r.description}</p>}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {manageError && <p className="text-sm text-red-600">{manageError}</p>}
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-gray-500">{selectedRoleIds.size} role{selectedRoleIds.size !== 1 ? 's' : ''} selected</span>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setManagingUser(null)}>Cancel</Button>
                  <Button onClick={saveManage} loading={manageSaving}>Save Changes</Button>
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import type { ApiResponse } from '@/types';

export default function ProfilePage() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveError, setSaveError] = useState('');

  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);
  const [notifLoaded, setNotifLoaded] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [notifMsg, setNotifMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    api.get<ApiResponse<{ emailNotifications: boolean }>>(`/users/${user.id}`)
      .then(res => {
        setEmailNotifications(res.data?.emailNotifications ?? true);
        setNotifLoaded(true);
      })
      .catch(() => setNotifLoaded(true));
  }, [user]);

  if (!user) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    setSaving(true);
    setSaveMsg('');
    setSaveError('');
    try {
      await api.patch(`/users/${user!.id}`, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      setSaveMsg('Profile updated successfully.');
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleNotifications() {
    setSavingNotif(true);
    setNotifMsg('');
    const next = !emailNotifications;
    try {
      await api.patch(`/users/${user!.id}`, { emailNotifications: next });
      setEmailNotifications(next);
      setNotifMsg(next ? 'Email notifications enabled.' : 'Email notifications disabled.');
    } catch {
      setNotifMsg('Failed to update preference.');
    } finally {
      setSavingNotif(false);
    }
  }

  return (
    <div>
      <Header title="My Profile" />
      <div className="p-6 max-w-lg mx-auto space-y-5">

        {/* Avatar + identity */}
        <Card>
          <CardContent className="pt-6 pb-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold shrink-0">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-lg">{user.firstName} {user.lastName}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
              {user.isSuperAdmin && (
                <span className="mt-1 inline-block text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  System Administrator
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit name */}
        <Card>
          <CardHeader><CardTitle>Edit Name</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                />
                <Input
                  label="Last Name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                />
              </div>
              {saveMsg && <p className="text-sm text-green-600">{saveMsg}</p>}
              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
              <div className="flex justify-end">
                <Button type="submit" loading={saving}>Save Changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Notification preferences */}
        <Card>
          <CardHeader><CardTitle>Notification Preferences</CardTitle></CardHeader>
          <CardContent>
            {!notifLoaded ? (
              <div className="h-10 animate-pulse bg-gray-100 rounded" />
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Email notifications</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Receive emails for task assignments and request status changes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleNotifications}
                  disabled={savingNotif}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                    emailNotifications ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={emailNotifications}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      emailNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )}
            {notifMsg && (
              <p className="mt-2 text-xs text-gray-500">{notifMsg}</p>
            )}
          </CardContent>
        </Card>

        {/* Account info (read-only) */}
        <Card>
          <CardHeader><CardTitle>Account</CardTitle></CardHeader>
          <CardContent>
            <dl className="divide-y divide-gray-100">
              <div className="py-2.5 grid grid-cols-3 gap-4">
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="col-span-2 text-sm text-gray-900">{user.email}</dd>
              </div>
              <div className="py-2.5 grid grid-cols-3 gap-4">
                <dt className="text-sm font-medium text-gray-500">Permissions</dt>
                <dd className="col-span-2 text-sm text-gray-900">
                  {user.isSuperAdmin ? 'All permissions (super admin)' : `${user.permissions.length} permission${user.permissions.length !== 1 ? 's' : ''}`}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

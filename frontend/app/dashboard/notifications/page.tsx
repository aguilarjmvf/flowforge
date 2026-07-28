'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import type { ApiResponse, Notification } from '@/types';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    api.get<ApiResponse<Notification[]>>('/notifications')
      .then((res) => setNotifications(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function markAll() {
    await api.patch('/notifications/read-all');
    load();
  }

  async function markOne(id: string) {
    await api.patch(`/notifications/${id}/read`);
    load();
  }

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div>
      <Header title="Notifications" />
      <div className="p-6 max-w-2xl mx-auto">
        {unread > 0 && (
          <div className="flex justify-end mb-4">
            <Button size="sm" variant="ghost" onClick={markAll}>Mark all as read</Button>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <Card key={i}><CardContent className="h-16 animate-pulse bg-gray-50" /></Card>)}
          </div>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-3xl mb-2">🔔</p>
              <p className="text-gray-500">No notifications yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <Card key={n.id} className={cn(!n.isRead && 'border-blue-200 bg-blue-50/50')}>
                <CardContent className="py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {!n.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />}
                        <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                    {!n.isRead && (
                      <button onClick={() => markOne(n.id)} className="text-xs text-blue-600 hover:underline shrink-0">
                        Mark read
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { sops } from '../api/client';
import { useAuth } from './useAuth';
import type { SOP } from '../types';

interface UserSopsResult {
  /** SOPs assigned to user in draft or review status (can edit) */
  tasks: SOP[];
  /** SOPs in pending_approval status (waiting for admin) */
  pending: SOP[];
  /** SOPs in active status (completed/reference) */
  completed: SOP[];
  /** All SOPs assigned to user */
  all: SOP[];
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Reload the SOPs */
  reload: () => Promise<void>;
}

export function useUserSops(): UserSopsResult {
  const { user } = useAuth();
  const [sopList, setSopList] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSops = async () => {
    if (!user) {
      setSopList([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await sops.list();
      // Filter to only SOPs assigned to this user
      const userSops = data.filter(sop => sop.assigned_to === user.id);
      setSopList(userSops);
    } catch (err) {
      setError('Failed to load your SOPs');
      setSopList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSops();
  }, [user?.id]);

  // Categorize SOPs by status
  const { tasks, pending, completed } = useMemo(() => {
    const tasks: SOP[] = [];
    const pending: SOP[] = [];
    const completed: SOP[] = [];

    for (const sop of sopList) {
      switch (sop.status) {
        case 'draft':
        case 'review':
          tasks.push(sop);
          break;
        case 'pending_approval':
          pending.push(sop);
          break;
        case 'active':
          completed.push(sop);
          break;
      }
    }

    // Sort tasks by updated_at (most recent first)
    tasks.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    pending.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    completed.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    return { tasks, pending, completed };
  }, [sopList]);

  return {
    tasks,
    pending,
    completed,
    all: sopList,
    loading,
    error,
    reload: loadSops,
  };
}

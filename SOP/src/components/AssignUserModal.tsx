import { useState, useEffect } from 'react';
import { users } from '../api/client';
import type { User, SOP } from '../types';

interface AssignUserModalProps {
  sop: SOP;
  onClose: () => void;
  onAssign: (sopId: number, userId: number | null) => void;
}

export function AssignUserModal({ sop, onClose, onAssign }: AssignUserModalProps) {
  const [userList, setUserList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(sop.assigned_to);

  useEffect(() => {
    async function loadUsers() {
      try {
        const data = await users.list();
        setUserList(data.filter((u) => u.role !== 'admin' || true)); // Include all users
      } catch (err) {
        console.error('Failed to load users:', err);
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  const handleSubmit = () => {
    onAssign(sop.id, selectedUserId);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Assign User</h2>
          <p className="text-sm text-gray-500 mt-1">
            Assign a user to {sop.sop_number}: {sop.process_name || 'Untitled'}
          </p>
        </div>

        <div className="px-6 py-4">
          {loading ? (
            <div className="text-center py-4 text-gray-500">Loading users...</div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => setSelectedUserId(null)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                  selectedUserId === null
                    ? 'border-esi-blue bg-blue-50 text-esi-blue'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">Unassigned</div>
                <div className="text-sm text-gray-500">Remove assignment</div>
              </button>

              {userList.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    selectedUserId === user.id
                      ? 'border-esi-blue bg-blue-50 text-esi-blue'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-gray-500">
                    {user.email} · {user.role}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-esi-blue text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}

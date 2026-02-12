import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DndContext, DragOverlay, pointerWithin } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { DraggableSopCard } from '../components/DraggableSopCard';
import { DroppableColumn } from '../components/DroppableColumn';
import { AssignUserModal } from '../components/AssignUserModal';
import { SkeletonCard, SkeletonKanbanColumn } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { sops } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { canDrag, isDroppableColumn } from '../utils/permissions';
import type { SOP, SOPStatus } from '../types';

export function Dashboard() {
  const [sopList, setSopList] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'draft' | 'active' | 'review'>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [assigneeFilter, setAssigneeFilter] = useState<number | 'all' | 'unassigned'>('all');
  const [activeDragSop, setActiveDragSop] = useState<SOP | null>(null);
  const [assignModalSop, setAssignModalSop] = useState<SOP | null>(null);
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    loadSops();
  }, []);

  const loadSops = async () => {
    try {
      const data = await sops.list();
      setSopList(data);
    } catch (err) {
      setError('Failed to load SOPs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSop = async () => {
    try {
      const newSop = await sops.create();
      navigate(`/sop/${newSop.id}`);
    } catch (err) {
      setError('Failed to create SOP');
    }
  };

  const handleDeleteSop = async (e: React.MouseEvent, sopId: number, sopNumber: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Delete ${sopNumber}? This cannot be undone.`)) return;

    try {
      await sops.delete(sopId);
      setSopList(sopList.filter(s => s.id !== sopId));
      addToast(`${sopNumber} deleted`, 'success');
    } catch (err) {
      addToast('Failed to delete SOP', 'error');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const sop = (active.data.current as { sop: SOP })?.sop;
    if (sop) {
      setActiveDragSop(sop);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragSop(null);

    if (!over) return;

    const sop = (active.data.current as { sop: SOP })?.sop;
    const targetStatus = (over.data.current as { status: SOPStatus })?.status;

    if (!sop || !targetStatus || sop.status === targetStatus) return;

    // Check if transition is allowed
    if (!isDroppableColumn(targetStatus, sop.status, isAdmin)) {
      addToast(`Cannot move from ${sop.status} to ${targetStatus}`, 'warning');
      return;
    }

    // Optimistic update
    const originalList = [...sopList];
    setSopList(sopList.map(s =>
      s.id === sop.id ? { ...s, status: targetStatus } : s
    ));

    try {
      await sops.updateStatus(sop.id, targetStatus);
      addToast(`Moved ${sop.sop_number} to ${targetStatus}`, 'success');
    } catch (err) {
      // Rollback on error
      setSopList(originalList);
      addToast('Failed to update SOP status', 'error');
    }
  };

  const handleAssign = async (sopId: number, userId: number | null) => {
    const originalList = [...sopList];

    try {
      const updatedSop = await sops.assign(sopId, userId);
      setSopList(sopList.map(s => s.id === sopId ? updatedSop : s));
      addToast(userId ? 'User assigned successfully' : 'User unassigned', 'success');
    } catch (err) {
      setSopList(originalList);
      addToast('Failed to assign user', 'error');
    }
  };

  // Get unique assignees for filter
  const assignees = Array.from(
    new Map(
      sopList
        .filter((s: SOP) => s.assigned_to !== null)
        .map((s: SOP) => [s.assigned_to, { id: s.assigned_to!, name: s.assigned_to_name! }])
    ).values()
  );

  // Filter SOPs for board view by assignee
  const boardFilteredSops = sopList.filter((s: SOP) => {
    if (assigneeFilter === 'all') return true;
    if (assigneeFilter === 'unassigned') return s.assigned_to === null;
    return s.assigned_to === assigneeFilter;
  });

  const filteredSops = sopList.filter((sop) => {
    if (filter !== 'all' && sop.status !== filter) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        sop.sop_number.toLowerCase().includes(searchLower) ||
        sop.process_name?.toLowerCase().includes(searchLower) ||
        sop.department?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const statusCounts = {
    all: sopList.length,
    draft: sopList.filter((s) => s.status === 'draft').length,
    active: sopList.filter((s) => s.status === 'active').length,
    review: sopList.filter((s) => s.status === 'review').length,
  };

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">SOPs</h1>
        <button onClick={handleCreateSop} className="btn btn-primary">
          + New SOP
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          <button
            onClick={() => setViewMode('list')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'list'
                ? 'border-esi-blue text-esi-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('board')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'board'
                ? 'border-esi-blue text-esi-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Board
          </button>
        </nav>
      </div>

      {viewMode === 'list' ? (
      <>
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by SOP #, process name, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'draft', 'active', 'review'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-esi-blue text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)} ({statusCounts[status]})
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredSops.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500">
            {search || filter !== 'all' ? 'No SOPs match your filters' : 'No SOPs yet. Create your first one!'}
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredSops.map((sop) => (
            <div key={sop.id} className="card hover:shadow-lg transition-shadow relative">
              <Link to={`/sop/${sop.id}`} className="block">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono font-bold text-esi-blue">{sop.sop_number}</span>
                      <StatusBadge status={sop.status} />
                      {sop.assigned_to_name && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {sop.assigned_to_name}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900">
                      {sop.process_name || 'Untitled Process'}
                    </h3>
                    {sop.department && (
                      <p className="text-sm text-gray-500">{sop.department}</p>
                    )}
                  </div>
                  <div className="text-sm text-gray-400 text-right">
                    {sop.review_due_date && (
                      <div>Review: {new Date(sop.review_due_date).toLocaleDateString()}</div>
                    )}
                    <div>Updated: {new Date(sop.updated_at).toLocaleDateString()}</div>
                  </div>
                </div>
              </Link>
              {/* Quick action buttons */}
              <div className="absolute bottom-3 right-4 flex gap-2">
                <Link
                  to={`/sop/${sop.id}/questionnaires`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-purple-100 hover:text-purple-700 rounded transition-colors"
                  title="View Questionnaires"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {sop.questionnaire_count || 0}
                </Link>
                <Link
                  to={`/sop/${sop.id}/shadowing`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-teal-100 hover:text-teal-700 rounded transition-colors"
                  title="View Shadowing Observations"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {sop.shadowing_count || 0}
                </Link>
              </div>
              <div className="absolute top-2 right-2 flex items-center gap-1">
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setAssignModalSop(sop);
                    }}
                    className="p-2 text-gray-400 hover:text-esi-blue hover:bg-blue-50 rounded-md transition-colors"
                    title="Assign user"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={(e) => handleDeleteSop(e, sop.id, sop.sop_number)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Delete SOP"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </>
      ) : (
        /* Board View with Drag and Drop */
        <>
          {/* Assignee Filter */}
          <div className="mb-4 flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filter by assignee:</label>
            <select
              value={assigneeFilter === 'all' ? 'all' : assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="input max-w-xs"
            >
              <option value="all">All assignees</option>
              <option value="unassigned">Unassigned</option>
              {assignees.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonKanbanColumn key={i} />
              ))}
            </div>
          ) : (
          <DndContext
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Draft Column */}
              <DroppableColumn
                status="draft"
                title="Draft"
                count={boardFilteredSops.filter(s => s.status === 'draft').length}
                badgeColor="bg-yellow-100 text-yellow-800"
                isDroppable={activeDragSop ? isDroppableColumn('draft', activeDragSop.status, isAdmin) : false}
              >
                {boardFilteredSops.filter(s => s.status === 'draft').map(sop => (
                  <DraggableSopCard
                    key={sop.id}
                    sop={sop}
                    isDraggable={canDrag(sop, user)}
                    borderColor="border-yellow-400"
                    onAssignClick={setAssignModalSop}
                    isAdmin={isAdmin}
                  />
                ))}
                {boardFilteredSops.filter(s => s.status === 'draft').length === 0 && (
                  <div className="text-sm text-gray-400 text-center py-4">No drafts</div>
                )}
              </DroppableColumn>

              {/* Review Column */}
              <DroppableColumn
                status="review"
                title="Review"
                count={boardFilteredSops.filter(s => s.status === 'review').length}
                badgeColor="bg-red-100 text-red-800"
                isDroppable={activeDragSop ? isDroppableColumn('review', activeDragSop.status, isAdmin) : false}
              >
                {boardFilteredSops.filter(s => s.status === 'review').map(sop => (
                  <DraggableSopCard
                    key={sop.id}
                    sop={sop}
                    isDraggable={canDrag(sop, user)}
                    borderColor="border-red-400"
                    onAssignClick={setAssignModalSop}
                    isAdmin={isAdmin}
                  />
                ))}
                {boardFilteredSops.filter(s => s.status === 'review').length === 0 && (
                  <div className="text-sm text-gray-400 text-center py-4">No reviews</div>
                )}
              </DroppableColumn>

              {/* Pending Approval Column */}
              <DroppableColumn
                status="pending_approval"
                title="Pending Approval"
                count={boardFilteredSops.filter(s => s.status === 'pending_approval').length}
                badgeColor="bg-blue-100 text-blue-800"
                isDroppable={false}
              >
                {boardFilteredSops.filter(s => s.status === 'pending_approval').map(sop => (
                  <DraggableSopCard
                    key={sop.id}
                    sop={sop}
                    isDraggable={false}
                    borderColor="border-blue-400"
                    onAssignClick={setAssignModalSop}
                    isAdmin={isAdmin}
                  />
                ))}
                {boardFilteredSops.filter(s => s.status === 'pending_approval').length === 0 && (
                  <div className="text-sm text-gray-400 text-center py-4">None pending</div>
                )}
              </DroppableColumn>

              {/* Active Column */}
              <DroppableColumn
                status="active"
                title="Active"
                count={boardFilteredSops.filter(s => s.status === 'active').length}
                badgeColor="bg-green-100 text-green-800"
                isDroppable={false}
              >
                {boardFilteredSops.filter(s => s.status === 'active').map(sop => (
                  <DraggableSopCard
                    key={sop.id}
                    sop={sop}
                    isDraggable={canDrag(sop, user)}
                    borderColor="border-green-400"
                    onAssignClick={setAssignModalSop}
                    isAdmin={isAdmin}
                  />
                ))}
                {boardFilteredSops.filter(s => s.status === 'active').length === 0 && (
                  <div className="text-sm text-gray-400 text-center py-4">None active</div>
                )}
              </DroppableColumn>
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
              {activeDragSop && (
                <div className="bg-white rounded-lg p-3 shadow-lg border-l-4 border-esi-blue opacity-90">
                  <div className="font-mono text-xs text-gray-500">{activeDragSop.sop_number}</div>
                  <div className="font-medium text-gray-900 text-sm mt-1">
                    {activeDragSop.process_name || 'Untitled'}
                  </div>
                </div>
              )}
            </DragOverlay>
          </DndContext>
          )}
        </>
      )}

      {/* Assign User Modal - available in both list and board views */}
      {assignModalSop && (
        <AssignUserModal
          sop={assignModalSop}
          onClose={() => setAssignModalSop(null)}
          onAssign={handleAssign}
        />
      )}
    </Layout>
  );
}

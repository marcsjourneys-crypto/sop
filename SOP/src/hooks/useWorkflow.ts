import { useState, useEffect, useCallback } from 'react';
import { workflow } from '../api/client';
import type { WorkflowStep, WorkflowTransition } from '../types';

export function useWorkflow() {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [transitions, setTransitions] = useState<WorkflowTransition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWorkflow = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [stepsData, transitionsData] = await Promise.all([
        workflow.getSteps(),
        workflow.getTransitions(),
      ]);
      setSteps(stepsData);
      setTransitions(transitionsData);
    } catch (err) {
      setError('Failed to load workflow configuration');
      console.error('Error loading workflow:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkflow();
  }, [loadWorkflow]);

  // Get step by status key
  const getStep = useCallback((statusKey: string) => {
    return steps.find(s => s.status_key === statusKey);
  }, [steps]);

  // Get display label for a status
  const getStatusLabel = useCallback((statusKey: string) => {
    const step = getStep(statusKey);
    return step?.display_label || statusKey;
  }, [getStep]);

  // Get color for a status
  const getStatusColor = useCallback((statusKey: string) => {
    const step = getStep(statusKey);
    return step?.color || 'gray';
  }, [getStep]);

  // Check if a transition is allowed
  const canTransition = useCallback((fromStatus: string, toStatus: string, isAdmin: boolean) => {
    const transition = transitions.find(
      t => t.from_status === fromStatus && t.to_status === toStatus
    );
    if (!transition) return false;
    if (transition.requires_admin && !isAdmin) return false;
    return true;
  }, [transitions]);

  // Get allowed transitions from a status
  const getAllowedTransitions = useCallback((fromStatus: string, isAdmin: boolean) => {
    return transitions
      .filter(t => t.from_status === fromStatus)
      .filter(t => !t.requires_admin || isAdmin)
      .map(t => ({
        ...t,
        toStep: getStep(t.to_status),
      }));
  }, [transitions, getStep]);

  // Get initial status (for new SOPs)
  const getInitialStatus = useCallback(() => {
    const initialStep = steps.find(s => s.is_initial);
    return initialStep?.status_key || 'draft';
  }, [steps]);

  // Check if a status can be edited
  const canEditInStatus = useCallback((statusKey: string) => {
    const step = getStep(statusKey);
    return step?.can_edit ?? true;
  }, [getStep]);

  return {
    steps,
    transitions,
    loading,
    error,
    reload: loadWorkflow,
    getStep,
    getStatusLabel,
    getStatusColor,
    canTransition,
    getAllowedTransitions,
    getInitialStatus,
    canEditInStatus,
  };
}

// Color mapping for Tailwind classes
export const workflowColorMap: Record<string, { bg: string; text: string; border: string }> = {
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-400' },
  red: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-400' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-400' },
  green: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-400' },
  gray: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-400' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-400' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-400' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-400' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-400' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-400' },
};

export function getColorClasses(color: string) {
  return workflowColorMap[color] || workflowColorMap.gray;
}

import type { User, SOP, SOPStep, SOPResponsibility, SOPTroubleshooting, SOPRevision, SOPVersion, SOPApproval, Questionnaire, ShadowingObservation, Settings } from '../types';

const API_BASE = '/api';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Auth
export const auth = {
  login: (email: string, password: string) =>
    request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: User }>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// SOPs
export const sops = {
  list: () => request<SOP[]>('/sops'),
  get: (id: number) => request<SOP>(`/sops/${id}`),
  create: () => request<SOP>('/sops', { method: 'POST' }),
  update: (id: number, data: Partial<SOP>) =>
    request<SOP>(`/sops/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) => request<{ message: string }>(`/sops/${id}`, { method: 'DELETE' }),

  // Steps
  addStep: (sopId: number) =>
    request<SOPStep>(`/sops/${sopId}/steps`, { method: 'POST' }),
  updateStep: (sopId: number, stepId: number, data: Partial<SOPStep>) =>
    request<SOPStep>(`/sops/${sopId}/steps/${stepId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteStep: (sopId: number, stepId: number) =>
    request<{ message: string }>(`/sops/${sopId}/steps/${stepId}`, { method: 'DELETE' }),

  // Responsibilities
  addResponsibility: (sopId: number, data: { role_name?: string; responsibility_description?: string }) =>
    request<SOPResponsibility>(`/sops/${sopId}/responsibilities`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateResponsibility: (sopId: number, respId: number, data: Partial<SOPResponsibility>) =>
    request<SOPResponsibility>(`/sops/${sopId}/responsibilities/${respId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteResponsibility: (sopId: number, respId: number) =>
    request<{ message: string }>(`/sops/${sopId}/responsibilities/${respId}`, { method: 'DELETE' }),

  // Troubleshooting
  addTroubleshooting: (sopId: number, data: { problem?: string; possible_cause?: string; solution?: string }) =>
    request<SOPTroubleshooting>(`/sops/${sopId}/troubleshooting`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteTroubleshooting: (sopId: number, itemId: number) =>
    request<{ message: string }>(`/sops/${sopId}/troubleshooting/${itemId}`, { method: 'DELETE' }),

  // Revisions
  addRevision: (sopId: number, data: { revision_date?: string; description?: string; revised_by?: string }) =>
    request<SOPRevision>(`/sops/${sopId}/revisions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Version History
  getVersions: (sopId: number) =>
    request<SOPVersion[]>(`/sops/${sopId}/versions`),
  createVersion: (sopId: number, changeSummary?: string) =>
    request<SOPVersion>(`/sops/${sopId}/versions`, {
      method: 'POST',
      body: JSON.stringify({ change_summary: changeSummary }),
    }),
  getVersion: (sopId: number, versionId: number) =>
    request<SOPVersion>(`/sops/${sopId}/versions/${versionId}`),
  restoreVersion: (sopId: number, versionId: number) =>
    request<{ message: string; newVersion: number }>(`/sops/${sopId}/versions/${versionId}/restore`, {
      method: 'POST',
    }),

  // Approval Workflow
  getApprovals: (sopId: number) =>
    request<SOPApproval[]>(`/sops/${sopId}/approvals`),
  submitForApproval: (sopId: number) =>
    request<SOPApproval>(`/sops/${sopId}/submit-for-approval`, {
      method: 'POST',
    }),
  approve: (sopId: number, approvalId: number, comments?: string) =>
    request<{ message: string }>(`/sops/${sopId}/approvals/${approvalId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comments }),
    }),
  reject: (sopId: number, approvalId: number, comments: string) =>
    request<{ message: string }>(`/sops/${sopId}/approvals/${approvalId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ comments }),
    }),
};

// Questionnaires
export const questionnaires = {
  list: () => request<Questionnaire[]>('/questionnaires'),
  get: (id: number) => request<Questionnaire>(`/questionnaires/${id}`),
  create: (sopId?: number) =>
    request<Questionnaire>('/questionnaires', {
      method: 'POST',
      body: JSON.stringify({ sop_id: sopId }),
    }),
  update: (id: number, data: Partial<Questionnaire>) =>
    request<Questionnaire>(`/questionnaires/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) => request<{ message: string }>(`/questionnaires/${id}`, { method: 'DELETE' }),
};

// Shadowing
export const shadowing = {
  list: () => request<ShadowingObservation[]>('/shadowing'),
  get: (id: number) => request<ShadowingObservation>(`/shadowing/${id}`),
  create: (sopId?: number) =>
    request<ShadowingObservation>('/shadowing', {
      method: 'POST',
      body: JSON.stringify({ sop_id: sopId }),
    }),
  update: (id: number, data: Partial<ShadowingObservation>) =>
    request<ShadowingObservation>(`/shadowing/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) => request<{ message: string }>(`/shadowing/${id}`, { method: 'DELETE' }),
};

// Users (admin)
export const users = {
  list: () => request<User[]>('/users'),
  get: (id: number) => request<User>(`/users/${id}`),
  create: (data: { email: string; name: string; password: string; role?: 'admin' | 'user' }) =>
    request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<User & { active?: number }>) =>
    request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  resetPassword: (id: number, newPassword: string) =>
    request<{ message: string }>(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ new_password: newPassword }),
    }),
};

// Settings
export const settings = {
  get: () => request<Settings>('/settings'),
  update: (data: Partial<Settings>) =>
    request<Settings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

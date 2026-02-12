const API_BASE = 'http://localhost:3001/api';

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
    request<{ user: import('../types').User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: import('../types').User }>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// SOPs
export const sops = {
  list: () => request<import('../types').SOP[]>('/sops'),
  get: (id: number) => request<import('../types').SOP>(`/sops/${id}`),
  create: () => request<import('../types').SOP>('/sops', { method: 'POST' }),
  update: (id: number, data: Partial<import('../types').SOP>) =>
    request<import('../types').SOP>(`/sops/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) => request<{ message: string }>(`/sops/${id}`, { method: 'DELETE' }),

  // Steps
  addStep: (sopId: number) =>
    request<import('../types').SOPStep>(`/sops/${sopId}/steps`, { method: 'POST' }),
  updateStep: (sopId: number, stepId: number, data: Partial<import('../types').SOPStep>) =>
    request<import('../types').SOPStep>(`/sops/${sopId}/steps/${stepId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteStep: (sopId: number, stepId: number) =>
    request<{ message: string }>(`/sops/${sopId}/steps/${stepId}`, { method: 'DELETE' }),

  // Responsibilities
  addResponsibility: (sopId: number, data: { role_name?: string; responsibility_description?: string }) =>
    request<import('../types').SOPResponsibility>(`/sops/${sopId}/responsibilities`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateResponsibility: (sopId: number, respId: number, data: Partial<import('../types').SOPResponsibility>) =>
    request<import('../types').SOPResponsibility>(`/sops/${sopId}/responsibilities/${respId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteResponsibility: (sopId: number, respId: number) =>
    request<{ message: string }>(`/sops/${sopId}/responsibilities/${respId}`, { method: 'DELETE' }),

  // Troubleshooting
  addTroubleshooting: (sopId: number, data: { problem?: string; possible_cause?: string; solution?: string }) =>
    request<import('../types').SOPTroubleshooting>(`/sops/${sopId}/troubleshooting`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteTroubleshooting: (sopId: number, itemId: number) =>
    request<{ message: string }>(`/sops/${sopId}/troubleshooting/${itemId}`, { method: 'DELETE' }),

  // Revisions
  addRevision: (sopId: number, data: { revision_date?: string; description?: string; revised_by?: string }) =>
    request<import('../types').SOPRevision>(`/sops/${sopId}/revisions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Questionnaires
export const questionnaires = {
  list: () => request<import('../types').Questionnaire[]>('/questionnaires'),
  get: (id: number) => request<import('../types').Questionnaire>(`/questionnaires/${id}`),
  create: (sopId?: number) =>
    request<import('../types').Questionnaire>('/questionnaires', {
      method: 'POST',
      body: JSON.stringify({ sop_id: sopId }),
    }),
  update: (id: number, data: Partial<import('../types').Questionnaire>) =>
    request<import('../types').Questionnaire>(`/questionnaires/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) => request<{ message: string }>(`/questionnaires/${id}`, { method: 'DELETE' }),
};

// Shadowing
export const shadowing = {
  list: () => request<import('../types').ShadowingObservation[]>('/shadowing'),
  get: (id: number) => request<import('../types').ShadowingObservation>(`/shadowing/${id}`),
  create: (sopId?: number) =>
    request<import('../types').ShadowingObservation>('/shadowing', {
      method: 'POST',
      body: JSON.stringify({ sop_id: sopId }),
    }),
  update: (id: number, data: Partial<import('../types').ShadowingObservation>) =>
    request<import('../types').ShadowingObservation>(`/shadowing/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) => request<{ message: string }>(`/shadowing/${id}`, { method: 'DELETE' }),
};

// Users (admin)
export const users = {
  list: () => request<import('../types').User[]>('/users'),
  get: (id: number) => request<import('../types').User>(`/users/${id}`),
  create: (data: { email: string; name: string; password: string; role?: 'admin' | 'user' }) =>
    request<import('../types').User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<import('../types').User & { active?: number }>) =>
    request<import('../types').User>(`/users/${id}`, {
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
  get: () => request<import('../types').Settings>('/settings'),
  update: (data: Partial<import('../types').Settings>) =>
    request<import('../types').Settings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

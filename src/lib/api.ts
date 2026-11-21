import type {
  DirectoryEntry,
  LeaderboardEntry,
  SSLGDocument,
  SystemSettings,
  UserAccount,
} from '../types.ts';

const TOKEN_STORAGE_KEY = 'sslg_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // ignore json parse error
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: UserAccount; settings: SystemSettings }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => apiFetch<{ user: UserAccount; settings: SystemSettings }>('/api/auth/me'),

  updateMyAvatar: (avatarDataUrl: string | null) =>
    apiFetch<UserAccount>('/api/auth/me/avatar', {
      method: 'PATCH',
      body: JSON.stringify({ avatarDataUrl }),
    }),

  getLeaderboard: () => apiFetch<LeaderboardEntry[]>('/api/leaderboard'),

  getDirectory: () => apiFetch<DirectoryEntry[]>('/api/directory'),

  getSettings: () => apiFetch<SystemSettings>('/api/settings'),

  updateSettings: (payload: Partial<SystemSettings>) =>
    apiFetch<SystemSettings>('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getUsers: () => apiFetch<UserAccount[]>('/api/users'),

  createUser: (payload: {
    email: string;
    password: string;
    fullName: string;
    role: 'admin' | 'officer' | 'organization';
    positionOrClub: string;
    department: string;
  }) =>
    apiFetch<UserAccount>('/api/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateUser: (id: string, payload: Partial<UserAccount> & { password?: string }) =>
    apiFetch<UserAccount>(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteUser: (id: string) =>
    apiFetch<{ deleted: boolean; id: string }>(`/api/users/${id}`, {
      method: 'DELETE',
    }),

  getDocuments: () => apiFetch<SSLGDocument[]>('/api/documents'),

  uploadDocument: (formData: FormData) =>
    apiFetch<SSLGDocument>('/api/documents', {
      method: 'POST',
      body: formData,
    }),

  deleteDocument: (id: string) =>
    apiFetch<{ deleted: boolean; id: string }>(`/api/documents/${id}`, {
      method: 'DELETE',
    }),

  receiveForEsign: (id: string) =>
    apiFetch<SSLGDocument>(`/api/documents/${id}/receive-esign`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  esignDocument: (id: string, payload: { signatureDataUrl: string; remarks?: string }) =>
    apiFetch<SSLGDocument>(`/api/documents/${id}/esign`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateControlNumber: (id: string, controlNumber: string) =>
    apiFetch<SSLGDocument>(`/api/documents/${id}/control-number`, {
      method: 'PATCH',
      body: JSON.stringify({ controlNumber }),
    }),

  markDocumentPrinted: (id: string, remarks?: string) =>
    apiFetch<SSLGDocument>(`/api/documents/${id}/mark-printed`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    }),

  uploadHardcopyScanForDoc: (id: string, formData: FormData) =>
    apiFetch<SSLGDocument>(`/api/documents/${id}/hardcopy-scan`, {
      method: 'POST',
      body: formData,
    }),
};

export function getDocumentFileUrl(
  docId: string,
  options: { download?: boolean; original?: boolean } = {}
): string {
  const token = getStoredToken() || '';
  const params = new URLSearchParams({ token });
  if (options.download) params.set('download', 'true');
  if (options.original) params.set('original', 'true');
  return `/api/documents/${docId}/file?${params.toString()}`;
}

export function getHardcopyFileUrl(docId: string, download = false): string {
  const token = getStoredToken() || '';
  const params = new URLSearchParams({ token });
  if (download) params.set('download', 'true');
  return `/api/documents/${docId}/hardcopy-file?${params.toString()}`;
}

export function getCompilationPdfUrl(params: {
  periodType: 'monthly' | 'quarterly' | 'annual';
  year: string;
  month: string;
  quarter: string;
  category: string;
  coreValue?: string;
  docType: string;
}): string {
  const token = getStoredToken() || '';
  const q = new URLSearchParams({
    token,
    periodType: params.periodType,
    year: params.year,
    month: params.month,
    quarter: params.quarter,
    category: params.category,
    docType: params.docType,
  });
  if (params.coreValue && params.coreValue !== 'ALL') {
    q.set('coreValue', params.coreValue);
  }
  return `/api/compilations/pdf?${q.toString()}`;
}

export function getYearEndArchivePdfUrl(): string {
  const token = getStoredToken() || '';
  return `/api/hardcopy-archive/compile-pdf?token=${encodeURIComponent(token)}`;
}

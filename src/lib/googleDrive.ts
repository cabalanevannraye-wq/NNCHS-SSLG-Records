import {
  clearGoogleDriveAccessToken,
  getGoogleDriveAccessToken,
} from '../firebase.ts';

export class DriveAuthError extends Error {
  constructor(message = 'Google Drive authorization required. Please connect Google Drive.') {
    super(message);
    this.name = 'DriveAuthError';
  }
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  parents?: string[];
}

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const SSLG_FOLDER_NAME = 'SSLG Records';

function requireToken(): string {
  const token = getGoogleDriveAccessToken();
  if (!token) {
    throw new DriveAuthError();
  }
  return token;
}

async function driveFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = requireToken();
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(url, { ...init, headers });
  if (res.status === 401) {
    clearGoogleDriveAccessToken();
    throw new DriveAuthError('Google Drive session expired. Please reconnect Google Drive.');
  }
  if (!res.ok) {
    let message = `Google Drive request failed (${res.status})`;
    try {
      const payload = (await res.json()) as { error?: { message?: string } };
      if (payload.error?.message) {
        message = payload.error.message;
      }
    } catch {
      // ignore json parse failure
    }
    throw new Error(message);
  }
  return res;
}

export function isGoogleDriveConnected(): boolean {
  return Boolean(getGoogleDriveAccessToken());
}

export async function ensureSslgDriveFolder(): Promise<DriveFileItem> {
  const q = encodeURIComponent(
    `name = '${SSLG_FOLDER_NAME}' and mimeType = '${FOLDER_MIME}' and trashed = false`
  );
  const fields = encodeURIComponent('files(id,name,mimeType,modifiedTime,webViewLink)');
  const listRes = await driveFetch(
    `${DRIVE_API_BASE}/files?q=${q}&fields=${fields}&pageSize=5&spaces=drive`
  );
  const data = (await listRes.json()) as { files?: DriveFileItem[] };
  if (data.files && data.files.length > 0) {
    return data.files[0];
  }

  const createRes = await driveFetch(
    `${DRIVE_API_BASE}/files?fields=id,name,mimeType,modifiedTime,webViewLink`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: SSLG_FOLDER_NAME,
        mimeType: FOLDER_MIME,
      }),
    }
  );
  return createRes.json() as Promise<DriveFileItem>;
}

export async function listDriveFiles(options: {
  folderId?: string | null;
  searchQuery?: string;
  pageSize?: number;
} = {}): Promise<DriveFileItem[]> {
  const parts: string[] = ['trashed = false', `mimeType != '${FOLDER_MIME}'`];
  if (options.folderId) {
    const safeFolderId = options.folderId.replace(/'/g, "\\'");
    parts.push(`'${safeFolderId}' in parents`);
  }
  if (options.searchQuery?.trim()) {
    const safeQ = options.searchQuery.trim().replace(/'/g, "\\'");
    parts.push(`name contains '${safeQ}'`);
  }

  const q = encodeURIComponent(parts.join(' and '));
  const fields = encodeURIComponent(
    'files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,iconLink,parents)'
  );
  const pageSize = options.pageSize || 50;

  const res = await driveFetch(
    `${DRIVE_API_BASE}/files?q=${q}&fields=${fields}&pageSize=${pageSize}&orderBy=modifiedTime desc&spaces=drive`
  );
  const payload = (await res.json()) as { files?: DriveFileItem[] };
  return payload.files || [];
}

export async function uploadBlobToGoogleDrive(params: {
  blob: Blob;
  fileName: string;
  mimeType?: string;
  folderId?: string | null;
}): Promise<DriveFileItem> {
  const targetFolderId =
    params.folderId === undefined ? (await ensureSslgDriveFolder()).id : params.folderId;

  const metadata: Record<string, unknown> = {
    name: params.fileName,
    mimeType: params.mimeType || params.blob.type || 'application/octet-stream',
  };
  if (targetFolderId) {
    metadata.parents = [targetFolderId];
  }

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', params.blob, params.fileName);

  const fields = encodeURIComponent(
    'id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,parents'
  );
  const res = await driveFetch(
    `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=${fields}`,
    {
      method: 'POST',
      body: form,
    }
  );
  return res.json() as Promise<DriveFileItem>;
}

export async function downloadDriveFileBlob(
  fileId: string,
  mimeType?: string
): Promise<{ blob: Blob; resolvedMimeType: string; extension: string }> {
  const safeId = encodeURIComponent(fileId);
  if (mimeType?.startsWith('application/vnd.google-apps.')) {
    const exportMime = 'application/pdf';
    const res = await driveFetch(
      `${DRIVE_API_BASE}/files/${safeId}/export?mimeType=${encodeURIComponent(exportMime)}`
    );
    const blob = await res.blob();
    return { blob, resolvedMimeType: exportMime, extension: '.pdf' };
  }

  const res = await driveFetch(`${DRIVE_API_BASE}/files/${safeId}?alt=media`);
  const blob = await res.blob();
  const resolvedMimeType = mimeType || blob.type || 'application/octet-stream';
  return { blob, resolvedMimeType, extension: '' };
}

export async function downloadDriveFileAsFile(driveFile: DriveFileItem): Promise<File> {
  const { blob, resolvedMimeType, extension } = await downloadDriveFileBlob(
    driveFile.id,
    driveFile.mimeType
  );
  const finalName =
    extension && !driveFile.name.toLowerCase().endsWith(extension)
      ? `${driveFile.name}${extension}`
      : driveFile.name;
  return new File([blob], finalName, { type: resolvedMimeType });
}

export async function deleteDriveFile(fileId: string): Promise<void> {
  const safeId = encodeURIComponent(fileId);
  await driveFetch(`${DRIVE_API_BASE}/files/${safeId}`, {
    method: 'DELETE',
  });
}

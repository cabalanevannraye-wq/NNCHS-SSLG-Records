import { onIdTokenChanged } from 'firebase/auth';
import { auth } from '../firebase.ts';
import type { SSLGDocument } from '../types.ts';
import {
  clientCompileBinderPdfBlob,
  clientCompileYearEndPdfBlob,
  clientStampSignaturePdf,
} from './clientPdf.ts';
import {
  downloadDriveFileBlob,
  isGoogleDriveConnected,
  uploadBlobToGoogleDrive,
} from './googleDrive.ts';

let latestIdToken: string | null = null;

onIdTokenChanged(auth, async (user) => {
  if (!user) {
    latestIdToken = null;
    return;
  }
  try {
    latestIdToken = await user.getIdToken();
  } catch {
    latestIdToken = null;
  }
});

const rawApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '';
export const API_BASE_URL = rawApiBase.trim().replace(/\/+$/, '');

export function buildApiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalized}` : normalized;
}

export async function getFreshIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Authentication required. Please sign in with Google.');
  }
  const token = await user.getIdToken();
  latestIdToken = token;
  return token;
}

export function getCachedIdToken(): string {
  return latestIdToken || '';
}

function isStaticHostFallbackStatus(status: number, contentType: string | null): boolean {
  if (status === 405 || status === 502 || status === 503 || status === 504) {
    return true;
  }
  if (status === 404 && contentType && !contentType.includes('application/json')) {
    return true;
  }
  return false;
}

class StaticHostFallbackError extends Error {
  constructor(status: number) {
    super(`Backend route unavailable (${status})`);
    this.name = 'StaticHostFallbackError';
  }
}

async function authedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getFreshIdToken();
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let res: Response;
  try {
    res = await fetch(buildApiUrl(url), { ...options, headers });
  } catch {
    throw new StaticHostFallbackError(0);
  }

  if (!res.ok) {
    if (isStaticHostFallbackStatus(res.status, res.headers.get('content-type'))) {
      throw new StaticHostFallbackError(res.status);
    }
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // ignore json parse error
    }
    throw new Error(message);
  }
  return res;
}

export interface UploadedFileMeta {
  filePath: string;
  fileName: string;
  fileMimeType: string;
  fileSize: number;
  driveFileId?: string | null;
  driveWebViewLink?: string | null;
}

export const api = {
  uploadFile: async (file: File): Promise<UploadedFileMeta> => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await authedFetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });
      return (await res.json()) as UploadedFileMeta;
    } catch (err) {
      if (!(err instanceof StaticHostFallbackError)) {
        throw err;
      }
      if (isGoogleDriveConnected()) {
        const uploadedDrive = await uploadBlobToGoogleDrive({
          blob: file,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
        });
        return {
          filePath: `drive:${uploadedDrive.id}`,
          fileName: file.name,
          fileMimeType: file.type || 'application/octet-stream',
          fileSize: file.size,
          driveFileId: uploadedDrive.id,
          driveWebViewLink: uploadedDrive.webViewLink || null,
        };
      }
      return {
        filePath: `local:${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
        fileName: file.name,
        fileMimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
        driveFileId: null,
        driveWebViewLink: null,
      };
    }
  },

  stampSignature: async (payload: {
    doc: SSLGDocument;
    controlNumber: string;
    signatureDataUrl: string;
    signerName: string;
    signerPosition: string;
    signedAt: string;
  }): Promise<{ signedFilePath: string | null }> => {
    try {
      const res = await authedFetch('/api/files/stamp-signature', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return (await res.json()) as { signedFilePath: string | null };
    } catch (err) {
      if (!(err instanceof StaticHostFallbackError)) {
        throw err;
      }
      let sourceBytes: Uint8Array | undefined;
      const driveId =
        payload.doc.driveFileId ||
        (payload.doc.filePath.startsWith('drive:') ? payload.doc.filePath.slice(6) : null);
      if (driveId && isGoogleDriveConnected()) {
        try {
          const { blob } = await downloadDriveFileBlob(driveId, payload.doc.fileMimeType);
          sourceBytes = new Uint8Array(await blob.arrayBuffer());
        } catch {
          sourceBytes = undefined;
        }
      }

      const stampedBytes = await clientStampSignaturePdf({
        ...payload,
        sourceFileBytes: sourceBytes,
      });

      if (isGoogleDriveConnected()) {
        const safeCtrl = payload.controlNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
        const uploaded = await uploadBlobToGoogleDrive({
          blob: new Blob([Uint8Array.from(stampedBytes)], { type: 'application/pdf' }),
          fileName: `SIGNED_${safeCtrl}_${Date.now()}.pdf`,
          mimeType: 'application/pdf',
        });
        return { signedFilePath: `drive:${uploaded.id}` };
      }

      return { signedFilePath: payload.doc.signedFilePath ?? null };
    }
  },

  deleteFiles: async (paths: Array<string | null | undefined>): Promise<void> => {
    const filtered = paths.filter(
      (p): p is string =>
        typeof p === 'string' && p.length > 0 && !p.startsWith('drive:') && !p.startsWith('local:')
    );
    if (filtered.length === 0) return;
    try {
      await authedFetch('/api/files/delete', {
        method: 'POST',
        body: JSON.stringify({ paths: filtered }),
      });
    } catch (err) {
      if (!(err instanceof StaticHostFallbackError)) {
        throw err;
      }
    }
  },

  compileBinderPdfBlob: async (payload: {
    documents: SSLGDocument[];
    organizationHeader: string;
    schoolYear: string;
    periodLabel: string;
    categoryLabel: string;
  }): Promise<Blob> => {
    try {
      const res = await authedFetch('/api/pdf/compile-binder', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.blob();
    } catch (err) {
      if (!(err instanceof StaticHostFallbackError)) {
        throw err;
      }
      return clientCompileBinderPdfBlob(payload);
    }
  },

  compileYearEndPdfBlob: async (payload: {
    documents: SSLGDocument[];
    organizationHeader: string;
    schoolYear: string;
  }): Promise<Blob> => {
    try {
      const res = await authedFetch('/api/pdf/compile-year-end', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.blob();
    } catch (err) {
      if (!(err instanceof StaticHostFallbackError)) {
        throw err;
      }
      return clientCompileYearEndPdfBlob(payload);
    }
  },
};

export function getDocumentFileUrl(
  doc: SSLGDocument,
  options: { download?: boolean; original?: boolean } = {}
): string {
  const rel = !options.original && doc.signedFilePath ? doc.signedFilePath : doc.filePath;
  if (rel.startsWith('drive:')) {
    const id = rel.slice(6);
    return options.download
      ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`
      : doc.driveWebViewLink || `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`;
  }
  if (doc.driveWebViewLink && rel.startsWith('local:')) {
    return doc.driveWebViewLink;
  }
  const name =
    !options.original && doc.signedFilePath
      ? `${doc.controlNumber || doc.id}_Signed.pdf`
      : doc.fileName;
  const params = new URLSearchParams({
    token: getCachedIdToken(),
    name,
  });
  if (options.download) params.set('download', 'true');
  return buildApiUrl(`/api/files/${encodeURIComponent(rel)}?${params.toString()}`);
}

export function getHardcopyFileUrl(doc: SSLGDocument, download = false): string {
  if (!doc.hardcopyScan?.filePath) return '';
  const rel = doc.hardcopyScan.filePath;
  if (rel.startsWith('drive:')) {
    const id = rel.slice(6);
    return download
      ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`
      : `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`;
  }
  const name = `${doc.controlNumber || doc.id}_HardcopyScan_${doc.hardcopyScan.fileName}`;
  const params = new URLSearchParams({
    token: getCachedIdToken(),
    name,
  });
  if (download) params.set('download', 'true');
  return buildApiUrl(`/api/files/${encodeURIComponent(rel)}?${params.toString()}`);
}

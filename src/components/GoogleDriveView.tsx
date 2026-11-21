import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  HardDrive,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  connectGoogleDriveWithPopup,
  getGoogleDriveAccessToken,
  subscribeDriveTokenChange,
} from '../firebase.ts';
import {
  deleteDriveFile,
  downloadDriveFileBlob,
  DriveAuthError,
  ensureSslgDriveFolder,
  listDriveFiles,
  uploadBlobToGoogleDrive,
  type DriveFileItem,
} from '../lib/googleDrive.ts';
import { formatDateTime, formatFileSize } from './SSLGCrest.tsx';

export function GoogleDriveConnectCard({
  onConnected,
  compact = false,
  subtitle = 'Connect your Google account to browse, upload, and archive SSLG files in Google Drive.',
}: {
  onConnected?: () => void;
  compact?: boolean;
  subtitle?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    setError('');
    setBusy(true);
    try {
      await connectGoogleDriveWithPopup();
      onConnected?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect Google Drive.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl ${
        compact ? 'p-4' : 'p-8 text-center max-w-lg mx-auto'
      } space-y-4`}
    >
      <div className={compact ? 'flex items-center gap-3' : 'space-y-2'}>
        <div
          className={`${
            compact ? 'w-9 h-9' : 'w-12 h-12 mx-auto'
          } rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0`}
        >
          <HardDrive className={`${compact ? 'w-4 h-4' : 'w-6 h-6'} text-blue-800`} />
        </div>
        <div>
          <h3 className={`${compact ? 'text-sm' : 'text-base'} font-bold text-slate-900`}>
            Connect Google Drive
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">{subtitle}</p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 text-left">
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={handleConnect}
        className="inline-flex items-center justify-center gap-2.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-60"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.5 14.6 2.6 12 2.6 6.8 2.6 2.6 6.8 2.6 12s4.2 9.4 9.4 9.4c5.4 0 9-3.8 9-9.1 0-.6-.1-1.1-.2-1.6H12z"
          />
          <path
            fill="#34A853"
            d="M3.7 7.4l3.2 2.3C7.8 7.6 9.7 6.3 12 6.3c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.5 14.6 2.6 12 2.6 8.3 2.6 5.1 4.6 3.7 7.4z"
          />
          <path
            fill="#FBBC05"
            d="M12 21.4c2.5 0 4.7-.8 6.2-2.3l-2.9-2.4c-.8.6-1.9 1-3.3 1-3.9 0-5.2-2.6-5.5-3.9l-3.2 2.5c1.4 2.9 4.5 5.1 8.7 5.1z"
          />
          <path
            fill="#4285F4"
            d="M20.8 12.3c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.3 1.4-1.1 2.4-2.1 3l2.9 2.4c1.7-1.6 2.5-3.9 2.5-7.7z"
          />
        </svg>
        <span>{busy ? 'Connecting...' : 'Sign in with Google'}</span>
      </button>
    </div>
  );
}

export function GoogleDriveView() {
  const [hasToken, setHasToken] = useState(() => Boolean(getGoogleDriveAccessToken()));
  const [scopeMode, setScopeMode] = useState<'sslg' | 'all'>('sslg');
  const [sslgFolder, setSslgFolder] = useState<DriveFileItem | null>(null);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<DriveFileItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    return subscribeDriveTokenChange((tok) => {
      setHasToken(Boolean(tok));
    });
  }, []);

  const loadFiles = useCallback(async () => {
    if (!getGoogleDriveAccessToken()) {
      setHasToken(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      let folder = sslgFolder;
      if (scopeMode === 'sslg' && !folder) {
        folder = await ensureSslgDriveFolder();
        setSslgFolder(folder);
      }
      const list = await listDriveFiles({
        folderId: scopeMode === 'sslg' ? folder?.id : undefined,
        searchQuery: searchQuery.trim() || undefined,
        pageSize: 50,
      });
      setFiles(list);
    } catch (err) {
      if (err instanceof DriveAuthError) {
        setHasToken(false);
      }
      setError(err instanceof Error ? err.message : 'Failed to load Google Drive files.');
    } finally {
      setLoading(false);
    }
  }, [scopeMode, searchQuery, sslgFolder]);

  useEffect(() => {
    if (hasToken) {
      void loadFiles();
    }
  }, [hasToken, scopeMode, loadFiles]);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setNotice('');
    setUploading(true);
    try {
      const folder = sslgFolder || (await ensureSslgDriveFolder());
      setSslgFolder(folder);
      const created = await uploadBlobToGoogleDrive({
        blob: file,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        folderId: folder.id,
      });
      setNotice(`Uploaded "${created.name}" to Google Drive → SSLG Records.`);
      await loadFiles();
    } catch (err) {
      if (err instanceof DriveAuthError) setHasToken(false);
      setError(err instanceof Error ? err.message : 'Failed to upload file to Google Drive.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadFile = async (item: DriveFileItem) => {
    setError('');
    try {
      const { blob, extension } = await downloadDriveFileBlob(item.id, item.mimeType);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        extension && !item.name.toLowerCase().endsWith(extension)
          ? `${item.name}${extension}`
          : item.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      if (err instanceof DriveAuthError) setHasToken(false);
      setError(err instanceof Error ? err.message : 'Failed to download file from Google Drive.');
    }
  };

  const handleConfirmedDelete = async () => {
    if (!confirmDeleteFile) return;
    setDeleting(true);
    setError('');
    setNotice('');
    try {
      await deleteDriveFile(confirmDeleteFile.id);
      setFiles((prev) => prev.filter((f) => f.id !== confirmDeleteFile.id));
      setNotice(`Deleted "${confirmDeleteFile.name}" from Google Drive.`);
      setConfirmDeleteFile(null);
    } catch (err) {
      if (err instanceof DriveAuthError) setHasToken(false);
      setError(err instanceof Error ? err.message : 'Failed to delete Google Drive file.');
    } finally {
      setDeleting(false);
    }
  };

  if (!hasToken) {
    return (
      <div className="py-8">
        <GoogleDriveConnectCard
          onConnected={() => setHasToken(true)}
          subtitle="Authorize Google Drive access to browse your SSLG Records folder, upload files, import submissions directly, and save signed PDF archives."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-800" />
            <h2 className="text-lg font-bold text-slate-900">Google Drive Vault</h2>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Direct integration with your Google Drive for backups, compiled PDF binders, and document imports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {sslgFolder?.webViewLink && (
            <a
              href={sslgFolder.webViewLink}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 text-xs font-semibold border border-slate-300 text-slate-800 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open SSLG Folder</span>
            </a>
          )}
          <label className="px-4 py-2 text-sm font-semibold bg-blue-800 hover:bg-blue-900 text-white rounded-lg inline-flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>{uploading ? 'Uploading...' : 'Upload to Drive'}</span>
            <input
              type="file"
              disabled={uploading}
              onChange={handleUploadFile}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800">
          {error}
        </div>
      )}

      {notice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Explicit Confirmation Dialog before Drive deletion */}
      {confirmDeleteFile && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Delete File from Google Drive?
            </h3>
            <p className="text-sm text-slate-600">
              This will permanently remove <strong>{confirmDeleteFile.name}</strong> from your
              Google Drive. This action cannot be undone from SSLG Records.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmDeleteFile(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmedDelete}
                className="px-4 py-2 text-sm font-semibold bg-rose-700 hover:bg-rose-800 text-white rounded-lg cursor-pointer disabled:opacity-60"
              >
                {deleting ? 'Deleting...' : 'Delete from Drive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setScopeMode('sslg')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer inline-flex items-center gap-1.5 ${
              scopeMode === 'sslg'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>SSLG Records Folder</span>
          </button>
          <button
            type="button"
            onClick={() => setScopeMode('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer inline-flex items-center gap-1.5 ${
              scopeMode === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>All My Drive</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void loadFiles();
              }}
              placeholder="Search Drive filename..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800"
            />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadFiles()}
            className="px-3 py-2 text-xs font-semibold border border-slate-300 text-slate-800 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Drive File List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">File Name</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Modified</th>
                <th className="py-3 px-3 text-right">Size</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {loading && files.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500">
                    Loading Google Drive files...
                  </td>
                </tr>
              ) : files.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500">
                    {scopeMode === 'sslg'
                      ? 'No files in your "SSLG Records" Google Drive folder yet. Upload a file or save any SSLG document/binder to Drive.'
                      : 'No matching files found in your Google Drive.'}
                  </td>
                </tr>
              ) : (
                files.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-blue-700 shrink-0" />
                        <span className="truncate max-w-xs sm:max-w-md">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-600">
                      {item.mimeType.includes('pdf')
                        ? 'PDF Document'
                        : item.mimeType.includes('google-apps.document')
                        ? 'Google Doc'
                        : item.mimeType.includes('wordprocessingml')
                        ? 'Word (.docx)'
                        : item.mimeType.startsWith('image/')
                        ? 'Image'
                        : item.mimeType}
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      {item.modifiedTime ? formatDateTime(item.modifiedTime) : '—'}
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-600 text-right tabular-nums whitespace-nowrap">
                      {item.size ? formatFileSize(Number(item.size)) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {item.webViewLink && (
                          <a
                            href={item.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 text-slate-800 hover:bg-slate-100 rounded-md inline-flex items-center gap-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open</span>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleDownloadFile(item)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteFile(item)}
                          className="p-1.5 text-rose-700 hover:bg-rose-50 rounded-md cursor-pointer"
                          title="Delete from Drive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

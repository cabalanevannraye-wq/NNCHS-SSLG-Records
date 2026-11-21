import {
  CheckCircle2,
  FileUp,
  PenTool,
  Printer,
  Tag,
} from 'lucide-react';
import type { WorkflowStage } from '../types.ts';

export function SSLGCrest({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <img
      src="/nnchssslglogo.png"
      alt="NNCHS Supreme Secondary Learner Government Logo"
      className={`object-contain select-none ${className}`}
    />
  );
}

const AVATAR_SIZE_MAP = {
  xs: 'w-7 h-7 text-[11px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-16 h-16 text-lg',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function UserAvatar({
  fullName,
  avatarDataUrl,
  size = 'md',
  className = '',
}: {
  fullName: string;
  avatarDataUrl?: string | null;
  size?: keyof typeof AVATAR_SIZE_MAP;
  className?: string;
}) {
  const sizeClass = AVATAR_SIZE_MAP[size];
  if (avatarDataUrl) {
    return (
      <img
        src={avatarDataUrl}
        alt={fullName}
        className={`${sizeClass} rounded-full object-cover border border-slate-200 bg-slate-100 shrink-0 ${className}`}
      />
    );
  }
  return (
    <div
      aria-label={fullName}
      className={`${sizeClass} rounded-full bg-slate-800 text-white font-bold flex items-center justify-center border border-slate-700/20 shrink-0 select-none ${className}`}
    >
      {getInitials(fullName)}
    </div>
  );
}

export async function resizeImageFileToDataUrl(
  file: File,
  maxSize = 256
): Promise<string> {
  if (!/^image\/(png|jpeg|jpg|webp)$/i.test(file.type)) {
    throw new Error('Please choose a PNG, JPG, or WEBP image file.');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Image file is too large. Please select an image under 8MB.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid or corrupted image file.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const side = Math.min(maxSize, Math.max(img.width, img.height));
        canvas.width = side;
        canvas.height = side;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Unable to process image in browser.'));
          return;
        }
        // Center-crop square cover
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, side, side);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function StageBadge({ stage }: { stage: WorkflowStage }) {
  switch (stage) {
    case 5:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border rounded-md bg-emerald-50 text-emerald-800 border-emerald-200 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span>Stage 5 · Completed &amp; Archived</span>
        </span>
      );
    case 4:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border rounded-md bg-indigo-50 text-indigo-800 border-indigo-200 whitespace-nowrap">
          <Printer className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
          <span>Stage 4 · Printed</span>
        </span>
      );
    case 3:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border rounded-md bg-sky-50 text-sky-800 border-sky-200 whitespace-nowrap">
          <Tag className="w-3.5 h-3.5 text-sky-700 shrink-0" />
          <span>Stage 3 · Control No. &amp; Eartag</span>
        </span>
      );
    case 2:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border rounded-md bg-amber-50 text-amber-800 border-amber-200 whitespace-nowrap">
          <PenTool className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>Stage 2 · For E-Sign</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border rounded-md bg-slate-100 text-slate-800 border-slate-300 whitespace-nowrap">
          <FileUp className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span>Stage 1 · Submitted</span>
        </span>
      );
  }
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

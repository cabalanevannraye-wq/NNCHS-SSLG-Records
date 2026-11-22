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

export function NNCHSSchoolSeal({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <img
      src="/assets/aistudio/nnchs-logo_4218aa21.jpg"
      alt="Nabunturan National Comprehensive High School Seal"
      className={`object-cover rounded-full border border-blue-900/15 dark:border-yellow-400/30 bg-white select-none ${className}`}
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
      className={`${sizeClass} rounded-full bg-[#1e3a8a] text-[#fde047] font-bold flex items-center justify-center border border-blue-700/40 shrink-0 select-none ${className}`}
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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold border rounded-md bg-[#facc15] text-slate-950 border-[#eab308] whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-950 shrink-0" />
          <span>Stage 5 · Completed &amp; Archived</span>
        </span>
      );
    case 4:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border rounded-md bg-[#1e3a8a] text-white border-blue-900 whitespace-nowrap">
          <Printer className="w-3.5 h-3.5 text-[#fde047] shrink-0" />
          <span>Stage 4 · Printed</span>
        </span>
      );
    case 3:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border rounded-md bg-blue-100 text-blue-900 border-blue-300 whitespace-nowrap">
          <Tag className="w-3.5 h-3.5 text-blue-800 shrink-0" />
          <span>Stage 3 · Control No. &amp; Eartag</span>
        </span>
      );
    case 2:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border rounded-md bg-yellow-100 text-slate-950 border-yellow-300 whitespace-nowrap">
          <PenTool className="w-3.5 h-3.5 text-blue-900 shrink-0" />
          <span>Stage 2 · For E-Sign</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border rounded-md bg-blue-50 text-blue-900 border-blue-200 whitespace-nowrap">
          <FileUp className="w-3.5 h-3.5 text-blue-700 shrink-0" />
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

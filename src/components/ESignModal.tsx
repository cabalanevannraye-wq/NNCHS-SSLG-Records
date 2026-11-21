import React, { useEffect, useRef, useState } from 'react';
import { Check, Eraser, PenTool, Upload, X } from 'lucide-react';
import { firebaseService } from '../lib/firebaseService.ts';
import type { SSLGDocument, UserAccount } from '../types.ts';

interface ESignModalProps {
  doc: SSLGDocument;
  currentUser: UserAccount;
  onClose: () => void;
  onSigned: (updated: SSLGDocument) => void;
}

export function ESignModal({ doc, currentUser, onClose, onSigned }: ESignModalProps) {
  const [mode, setMode] = useState<'draw' | 'upload'>('draw');
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = '#0F172A';
  }, [mode]);

  const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPointerPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    isDrawingRef.current = true;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPointerPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handlePngUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'image/png') {
      setError('Please upload a transparent PNG signature image.');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApproveAndSign = async (e: React.FormEvent) => {
    e.preventDefault();
    let signatureDataUrl = '';
    if (mode === 'draw') {
      if (!hasDrawn || !canvasRef.current) {
        setError('Please draw your signature on the pad first.');
        return;
      }
      signatureDataUrl = canvasRef.current.toDataURL('image/png');
    } else {
      if (!uploadedDataUrl) {
        setError('Please upload a transparent PNG signature image.');
        return;
      }
      signatureDataUrl = uploadedDataUrl;
    }

    setError('');
    setSubmitting(true);
    try {
      const updated = await firebaseService.esignDocument(doc, currentUser, {
        signatureDataUrl,
        remarks: remarks.trim() || undefined,
      });
      onSigned(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply electronic signature');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 max-w-xl w-full shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Stage 2: Electronic Signature (E-Sign)
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Signing automatically generates a sequential Control Number and unlocks Print Eartag (Stage 3).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 cursor-pointer"
            aria-label="Close e-sign dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleApproveAndSign} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800">
              {error}
            </div>
          )}

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <p className="font-bold text-slate-900">{doc.title}</p>
            <p className="text-slate-600 mt-0.5">
              Author: {doc.organizationName} · {doc.category}
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('draw')}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors inline-flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'draw'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Draw Signature</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors inline-flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'upload'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload PNG Signature</span>
            </button>
          </div>

          {mode === 'draw' ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-600">
                  Draw smoothly using mouse or touch
                </span>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Clear Pad</span>
                </button>
              </div>
              <div className="border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={520}
                  height={160}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="w-full h-40 touch-none cursor-crosshair bg-white"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-600 rounded-lg p-5 bg-slate-50 cursor-pointer">
                {uploadedDataUrl ? (
                  <img
                    src={uploadedDataUrl}
                    alt="Uploaded signature preview"
                    className="max-h-24 object-contain mb-2"
                  />
                ) : (
                  <Upload className="w-7 h-7 text-blue-700 mb-2" />
                )}
                <span className="text-sm font-medium text-slate-800">
                  {uploadedDataUrl ? 'Change PNG signature image' : 'Choose transparent PNG signature'}
                </span>
                <input
                  type="file"
                  accept="image/png"
                  onChange={handlePngUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-slate-900">{currentUser.fullName}</div>
              <div className="text-slate-500">{currentUser.positionOrClub}</div>
            </div>
            <div className="text-right font-mono-code text-[11px] text-slate-500">
              {doc.controlNumber ? `CTRL: ${doc.controlNumber}` : 'Auto-issues Control No.'}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Signing Remarks (Optional)
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g., Reviewed and approved for printing."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? 'Signing & Issuing Control No...' : 'Approve & E-Sign'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

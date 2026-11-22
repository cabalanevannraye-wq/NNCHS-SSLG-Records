import { useCallback, useEffect, useRef } from 'react';
import { ArrowRight, RotateCcw, Sparkles, X } from 'lucide-react';
import { NNCHSSchoolSeal, SSLGCrest } from '../SSLGCrest.tsx';

export const WELCOME_SEEN_SESSION_KEY = 'nnchs_sslg_welcome_seen_v1';

const CONFETTI_COLORS = [
  '#1e3a8a',
  '#1d4ed8',
  '#2563eb',
  '#3b82f6',
  '#eab308',
  '#facc15',
  '#fde047',
] as const;

interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  aspect: number;
  angle: number;
  spin: number;
  color: string;
  alpha: number;
  shape: 'rect' | 'circle';
}

export function WelcomeOverlay({
  isOpen,
  schoolYear,
  onClose,
}: {
  isOpen: boolean;
  schoolYear: string;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<ConfettiPiece[]>([]);
  const reducedMotionRef = useRef(false);

  const spawnBurst = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (reducedMotionRef.current) return;

    const width = canvas.width;
    const height = canvas.height;
    const nextPieces: ConfettiPiece[] = [];
    const total = 125;

    for (let i = 0; i < total; i += 1) {
      const fromLeft = i % 2 === 0;
      const originX = fromLeft ? width * (0.15 + Math.random() * 0.25) : width * (0.6 + Math.random() * 0.25);
      const originY = -12 - Math.random() * (height * 0.25);
      nextPieces.push({
        x: originX,
        y: originY,
        vx: (Math.random() - 0.5) * 4.4,
        vy: 2.2 + Math.random() * 3.8,
        size: 6 + Math.random() * 6,
        aspect: 0.45 + Math.random() * 0.45,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.16,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        alpha: 0.85 + Math.random() * 0.15,
        shape: i % 5 === 0 ? 'circle' : 'rect',
      });
    }

    particlesRef.current = [...particlesRef.current.slice(-90), ...nextPieces];
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    reducedMotionRef.current =
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    if (!reducedMotionRef.current) {
      particlesRef.current = [];
      spawnBurst();

      const tick = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const active: ConfettiPiece[] = [];
        for (const p of particlesRef.current) {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.994;
          p.vy = Math.min(p.vy + 0.045, 7.2);
          p.angle += p.spin;
          if (p.y > canvas.height * 0.78) {
            p.alpha = Math.max(0, p.alpha - 0.015);
          }

          if (p.y <= canvas.height + 24 && p.alpha > 0.02) {
            active.push(p);
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.fillStyle = p.color;
            if (p.shape === 'circle') {
              ctx.beginPath();
              ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2);
              ctx.fill();
            } else {
              ctx.fillRect(-p.size / 2, (-p.size * p.aspect) / 2, p.size, p.size * p.aspect);
            }
            ctx.restore();
          }
        }
        particlesRef.current = active;
        rafRef.current = window.requestAnimationFrame(tick);
      };

      rafRef.current = window.requestAnimationFrame(tick);
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('keydown', handleKey);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      particlesRef.current = [];
    };
  }, [isOpen, onClose, spawnBurst]);

  if (!isOpen) return null;

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-sslg-fade"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sslg-welcome-heading"
      onClick={onClose}
    >
      {/* Blue & Compre Yellow Celebration Confetti Canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="fixed inset-0 w-full h-full pointer-events-none z-0"
      />

      <div
        className="relative z-10 w-full max-w-xl rounded-2xl backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-2 border-[#eab308]/80 dark:border-yellow-400/50 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-2 w-full bg-gradient-to-r from-[#1e3a8a] via-[#facc15] to-[#1d4ed8]" />

        <div className="p-6 sm:p-8 space-y-6 text-center">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close welcome banner"
            className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-500 hover:text-blue-950 dark:text-slate-400 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center justify-center gap-4 pt-1">
            <NNCHSSchoolSeal className="w-16 h-16 sm:w-20 sm:h-20 shadow-sm rounded-full" />
            <SSLGCrest className="w-16 h-16 sm:w-20 sm:h-20 shadow-sm rounded-full" />
          </div>

          <div className="space-y-2.5">
            <p className="text-xs font-extrabold uppercase tracking-widest text-blue-700 dark:text-[#fde047] flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Nabunturan National Comprehensive High School · SY {schoolYear}</span>
            </p>
            <h2
              id="sslg-welcome-heading"
              className="text-2xl sm:text-3xl font-extrabold text-blue-950 dark:text-white tracking-tight leading-tight text-balance"
            >
              Welcome to the Official Digital Portal of NNCHS-SSLG
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg mx-auto">
              Warm greetings to all Compre learners, registered clubs, advisers, and school
              stakeholders. Access Project &lsquo;Free Printing&rsquo;, official directories,
              confidential learner welfare reporting, and transparent governance updates in one
              shared space.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
            >
              <span>Enter Portal</span>
              <ArrowRight className="w-4 h-4 text-[#fde047]" />
            </button>

            <button
              type="button"
              onClick={spawnBurst}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#facc15] hover:bg-[#eab308] text-slate-950 text-sm font-extrabold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Replay Confetti</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

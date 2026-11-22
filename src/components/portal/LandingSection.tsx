import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Megaphone,
  MessageCircle,
  Printer,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import {
  DEFAULT_YORP_LOGO_PATH,
  type AboutPhotoItem,
  type BulletinPost,
  type PortalState,
} from '../../lib/portalStore.ts';
import { NNCHSSchoolSeal } from '../SSLGCrest.tsx';
import type { PortalJumpTarget } from './PublicNavbar.tsx';

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const totalFrames = 24;
    const timer = window.setInterval(() => {
      frame += 1;
      const progress = Math.min(1, frame / totalFrames);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (frame >= totalFrames) {
        window.clearInterval(timer);
      }
    }, 20);

    return () => window.clearInterval(timer);
  }, [value]);

  return (
    <span className="tabular-nums">
      {display.toLocaleString('en-US')}
      {suffix}
    </span>
  );
}

const YORP_ADVOCACIES = [
  'HEALTH',
  'EDUCATION',
  'ECONOMIC EMPOWERMENT',
  'SOCIAL INCLUSION',
  'PEACE BUILDING AND SECURITY',
  'GOVERNANCE',
  'ACTIVE LEADERSHIP',
  'GLOBAL MOBILITY',
  'AGRICULTURE',
];

export function LandingSection({
  portal,
  onNavigate,
}: {
  portal: PortalState;
  onNavigate: (target: PortalJumpTarget) => void;
}) {
  const slides = portal.heroSlides.length > 0 ? portal.heroSlides : [];
  const [slideIdx, setSlideIdx] = useState(0);
  const [activePostModal, setActivePostModal] = useState<BulletinPost | null>(null);
  const [activeAboutPhoto, setActiveAboutPhoto] = useState<AboutPhotoItem | null>(null);
  const [yorpImgFailed, setYorpImgFailed] = useState(false);

  useEffect(() => {
    if (slides.length <= 1) return;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const timer = window.setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % slides.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    if (slideIdx >= slides.length) setSlideIdx(0);
  }, [slides.length, slideIdx]);

  useEffect(() => {
    if (!activePostModal && !activeAboutPhoto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePostModal(null);
        setActiveAboutPhoto(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activePostModal, activeAboutPhoto]);

  const currentSlide = slides[slideIdx] || slides[0];
  const featuredPost = portal.bulletinPosts.find((p) => p.featured) || portal.bulletinPosts[0];

  return (
    <div className="space-y-12">
      {/* 1. DYNAMIC HERO SLIDESHOW */}
      {currentSlide && (
        <section className="relative overflow-hidden rounded-2xl bg-[#0f172a] text-white border border-blue-900 shadow-lg min-h-[380px] sm:min-h-[430px] flex items-end">
          <img
            key={currentSlide.id}
            src={currentSlide.imageUrl}
            alt={currentSlide.title}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover animate-sslg-fade"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/70 to-[#1e3a8a]/35"
          />

          {/* Slide Navigation Arrows */}
          {slides.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setSlideIdx((prev) => (prev - 1 + slides.length) % slides.length)}
                aria-label="Previous slide"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-[#0f172a]/70 hover:bg-[#1e3a8a] text-white border border-white/20 backdrop-blur-sm cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setSlideIdx((prev) => (prev + 1) % slides.length)}
                aria-label="Next slide"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-[#0f172a]/70 hover:bg-[#1e3a8a] text-white border border-white/20 backdrop-blur-sm cursor-pointer transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          <div className="relative z-10 w-full px-6 py-8 sm:px-12 sm:py-12 space-y-5 max-w-4xl">
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#fde047]">
              Nabunturan National Comprehensive High School · Supreme Secondary Learner Government
            </p>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-[1.15] text-balance">
              {currentSlide.title}
            </h1>
            <p className="text-sm sm:text-base text-slate-200 max-w-2xl leading-relaxed">
              {currentSlide.caption}
            </p>

            {/* Quick-Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onNavigate({ section: 'printing' })}
                className="px-5 py-3 rounded-xl bg-[#facc15] hover:bg-[#eab308] text-slate-950 font-extrabold text-xs sm:text-sm inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>Project &lsquo;Free Printing&rsquo;</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate({ section: 'directories' })}
                className="px-4 py-3 rounded-xl bg-[#1d4ed8] hover:bg-[#2563eb] text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Explore Directories</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate({ section: 'reporting' })}
                className="px-4 py-3 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white border border-white/25 font-bold text-xs sm:text-sm inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                <ShieldCheck className="w-4 h-4 text-[#fde047] shrink-0" />
                <span>Grievance &amp; Welfare Desk</span>
              </button>
            </div>

            {slides.length > 1 && (
              <div className="flex items-center gap-2 pt-2">
                {slides.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={`Show slide ${idx + 1}: ${s.title}`}
                    onClick={() => setSlideIdx(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      idx === slideIdx ? 'w-8 bg-[#facc15]' : 'w-2.5 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Editable Campus Advisory Banner & Scrolling Ticker */}
      <div className="space-y-3">
        {portal.campusAdvisory && (
          <div className="rounded-xl backdrop-blur-md bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/80 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <Megaphone className="w-5 h-5 text-blue-800 dark:text-[#fde047] shrink-0 mt-0.5 sm:mt-0" />
              <p className="text-xs sm:text-sm font-semibold text-blue-950 dark:text-slate-100">
                {portal.campusAdvisory}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate({ section: 'printing' })}
              className="text-xs font-extrabold text-blue-800 dark:text-yellow-300 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              Submit Print File →
            </button>
          </div>
        )}

        {portal.tickerMessages.length > 0 && (
          <div
            aria-label="Live Campus Advisory Ticker"
            className="rounded-xl bg-[#facc15] text-slate-950 border border-[#eab308] overflow-hidden flex items-center shadow-xs"
          >
            <div className="px-4 py-2.5 bg-[#1e3a8a] text-white text-xs font-extrabold uppercase tracking-wider shrink-0">
              Campus Advisory
            </div>
            <div className="flex-1 overflow-hidden py-2.5">
              <div className="animate-sslg-ticker text-xs font-bold text-slate-950 gap-10 whitespace-nowrap px-4">
                {[...portal.tickerMessages, ...portal.tickerMessages].map((msg, idx) => (
                  <span key={idx} className="inline-flex items-center gap-3">
                    <span>{msg}</span>
                    <span aria-hidden="true" className="text-blue-900 font-black">
                      ◆
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. ABOUT THE NNCHS-SSLG & NYC YORP RECOGNITION + EDITABLE IMPACT NUMBERS */}
      <section className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 backdrop-blur-md bg-white/75 dark:bg-slate-900/75 rounded-2xl border border-blue-900/10 dark:border-yellow-400/20 shadow-sm p-6 sm:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-900/10 dark:border-slate-800 pb-5">
              <div className="flex items-center gap-3.5">
                <NNCHSSchoolSeal className="w-12 h-12 shrink-0" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-yellow-300">
                    Learner Governance Profile
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950 dark:text-white tracking-tight mt-0.5">
                    About the NNCHS-SSLG
                  </h2>
                </div>
              </div>

              {/* NYC YORP Official Logo Badge */}
              <div className="flex items-center gap-3 bg-blue-50/75 dark:bg-slate-800/80 border border-blue-200/80 dark:border-slate-700 rounded-xl px-3.5 py-2.5 shrink-0">
                {!yorpImgFailed ? (
                  <img
                    src={portal.yorpLogoUrl || DEFAULT_YORP_LOGO_PATH}
                    alt="National Youth Commission YORP Logo"
                    referrerPolicy="no-referrer"
                    onError={() => setYorpImgFailed(true)}
                    className="w-12 h-12 object-contain shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-[#1e3a8a] text-[#fde047] font-extrabold text-xs flex items-center justify-center shrink-0">
                    YORP
                  </div>
                )}
                <div className="text-left">
                  <p className="text-[11px] font-extrabold text-blue-950 dark:text-white">
                    NYC YORP Registered
                  </p>
                  <p className="text-[11px] font-semibold text-blue-700 dark:text-yellow-300">
                    Renewed August 3, 2023
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
              The Nabunturan National Comprehensive High School – Supreme Secondary Learner
              Government (NNCHS-SSLG) is the highest governing and representative body of all
              students in the school, serving as the unified voice of the learner community. It
              leads initiatives and programs that uphold student welfare, promote academic
              excellence, and foster holistic youth development in alignment with the ideals of the
              Department of Education.
            </p>

            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed bg-blue-50/65 dark:bg-slate-800/65 border border-blue-100 dark:border-slate-700 rounded-xl p-4">
              Solidifying its commitment to youth-led governance, the SSLG is officially recognized
              as a Registered Youth Organization by the National Youth Commission (NYC) through the
              Youth Organization Registration Program (YORP). On August 3, 2023, the SSLG
              successfully renewed its YORP registration, continuing its steadfast mission to
              champion key advocacies in{' '}
              <strong className="text-blue-900 dark:text-yellow-300">
                HEALTH, EDUCATION, ECONOMIC EMPOWERMENT, SOCIAL INCLUSION, PEACE BUILDING AND
                SECURITY, GOVERNANCE, ACTIVE LEADERSHIP, GLOBAL MOBILITY, and AGRICULTURE
              </strong>
              .
            </p>
          </div>

          {/* Admin-Editable Impact Cards */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {portal.impactStats.map((stat, idx) => (
              <div
                key={stat.id}
                className={`rounded-2xl border p-6 flex flex-col justify-between shadow-sm ${
                  idx === 0
                    ? 'bg-[#1e3a8a] text-white border-blue-900'
                    : 'backdrop-blur-md bg-white/75 dark:bg-slate-900/75 border-blue-900/10 dark:border-yellow-400/20'
                }`}
              >
                <p
                  className={`text-xs font-bold uppercase tracking-wider ${
                    idx === 0 ? 'text-[#fde047]' : 'text-blue-700 dark:text-yellow-300'
                  }`}
                >
                  SY {portal.schoolYear}
                </p>
                <div className="mt-4">
                  <p
                    className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
                      idx === 0 ? 'text-white' : 'text-blue-950 dark:text-white'
                    }`}
                  >
                    <AnimatedCounter value={stat.value} suffix={stat.suffix || ''} />
                  </p>
                  <p
                    className={`text-xs font-semibold mt-1.5 ${
                      idx === 0 ? 'text-blue-100' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Horizontal Scrollable Photos Strip / Gallery inside About Section */}
        {portal.aboutPhotos.length > 0 && (
          <div className="backdrop-blur-md bg-white/75 dark:bg-slate-900/75 rounded-2xl border border-blue-900/10 dark:border-yellow-400/20 shadow-sm p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-[#fde047]">
                  NNCHS-SSLG Visual Highlights
                </p>
                <h3 className="text-base font-extrabold text-blue-950 dark:text-white">
                  Campus &amp; Learner Governance Photo Gallery
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Scroll horizontally →
              </span>
            </div>

            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2">
              {portal.aboutPhotos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setActiveAboutPhoto(photo)}
                  className="snap-start shrink-0 w-64 sm:w-72 rounded-xl overflow-hidden border border-blue-900/15 dark:border-yellow-400/20 bg-white dark:bg-slate-950 text-left group cursor-pointer transition-transform hover:-translate-y-0.5"
                >
                  <div className="h-40 bg-[#0f172a] overflow-hidden">
                    <img
                      src={photo.url}
                      alt={photo.caption}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="px-3.5 py-2.5">
                    <p className="text-xs font-bold text-blue-950 dark:text-slate-100 line-clamp-2">
                      {photo.caption}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 3. OFFICIAL BULLETIN BOARD & MESSENGER GROUP LINK */}
      <section className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-yellow-300">
              Campus Media &amp; Official Posts
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950 dark:text-white tracking-tight">
              Official Bulletin Board
            </h2>
          </div>

          {/* Join SSLG Updates Messenger Group CTA */}
          <a
            href={portal.messengerGroupUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 rounded-xl bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white border-2 border-[#facc15] font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2.5 transition-colors shadow-sm whitespace-nowrap shrink-0"
          >
            <MessageCircle className="w-4 h-4 text-[#facc15] shrink-0" />
            <span>Join SSLG Updates Messenger Group</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#fde047] shrink-0" />
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {featuredPost && (
            <article className="lg:col-span-5 backdrop-blur-md bg-white/75 dark:bg-slate-900/75 rounded-2xl border border-blue-900/10 dark:border-yellow-400/20 shadow-sm overflow-hidden flex flex-col justify-between">
              {featuredPost.photoUrl && (
                <img
                  src={featuredPost.photoUrl}
                  alt={featuredPost.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-52 object-cover"
                />
              )}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="text-xs font-semibold text-blue-700 dark:text-yellow-300">
                    {featuredPost.category} · {featuredPost.publishedAt}
                  </div>
                  <h3 className="text-xl font-bold text-blue-950 dark:text-white leading-snug">
                    {featuredPost.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {featuredPost.summary}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {featuredPost.author}
                  </span>
                  <div className="flex items-center gap-3">
                    {featuredPost.facebookPostUrl && (
                      <a
                        href={featuredPost.facebookPostUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                      >
                        <span>Facebook Post</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setActivePostModal(featuredPost)}
                      className="text-xs font-extrabold text-blue-900 dark:text-yellow-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Read Full Post</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          )}

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {portal.bulletinPosts
              .filter((p) => p.id !== featuredPost?.id)
              .map((post) => (
                <article
                  key={post.id}
                  className="backdrop-blur-md bg-white/75 dark:bg-slate-900/75 rounded-2xl border border-blue-900/10 dark:border-yellow-400/20 shadow-sm overflow-hidden flex flex-col justify-between hover:border-blue-400 dark:hover:border-yellow-300 transition-colors"
                >
                  {post.photoUrl && (
                    <img
                      src={post.photoUrl}
                      alt={post.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-36 object-cover"
                    />
                  )}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {post.category} · {post.publishedAt}
                      </p>
                      <h3 className="text-base font-bold text-blue-950 dark:text-white leading-snug">
                        {post.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                        {post.summary}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      {post.facebookPostUrl ? (
                        <a
                          href={post.facebookPostUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-blue-700 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                        >
                          <span>View on FB</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400 truncate">{post.author}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setActivePostModal(post)}
                        className="text-xs font-extrabold text-blue-900 dark:text-yellow-300 hover:underline shrink-0 cursor-pointer"
                      >
                        Read →
                      </button>
                    </div>
                  </div>
                </article>
              ))}
          </div>
        </div>
      </section>

      {/* About Gallery Lightbox Modal */}
      {activeAboutPhoto && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActiveAboutPhoto(null)}
          role="dialog"
          aria-modal="true"
          aria-label={activeAboutPhoto.caption}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 bg-[#1e3a8a] text-white flex items-center justify-between gap-4">
              <h3 className="text-sm font-bold truncate">{activeAboutPhoto.caption}</h3>
              <button
                type="button"
                onClick={() => setActiveAboutPhoto(null)}
                aria-label="Close photo preview"
                className="p-1 text-blue-100 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
              <img
                src={activeAboutPhoto.url}
                alt={activeAboutPhoto.caption}
                className="max-h-[70vh] rounded-xl object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Bulletin Reader Modal */}
      {activePostModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActivePostModal(null)}
          role="dialog"
          aria-modal="true"
          aria-label={activePostModal.title}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-[#1e3a8a] text-white flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#fde047]">
                  {activePostModal.category} · {activePostModal.publishedAt}
                </p>
                <h3 className="text-base font-bold text-white truncate">{activePostModal.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePostModal(null)}
                aria-label="Close bulletin"
                className="p-1.5 text-blue-100 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
              {activePostModal.photoUrl && (
                <img
                  src={activePostModal.photoUrl}
                  alt={activePostModal.title}
                  referrerPolicy="no-referrer"
                  className="w-full max-h-64 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                />
              )}
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Posted by {activePostModal.author}
              </p>
              <div className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                {activePostModal.fullBody}
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                {activePostModal.facebookPostUrl ? (
                  <a
                    href={activePostModal.facebookPostUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg bg-[#1d4ed8] text-white text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <span>Open Facebook Post</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={() => setActivePostModal(null)}
                  className="px-4 py-2 text-xs font-bold bg-slate-900 dark:bg-slate-800 text-white rounded-lg cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

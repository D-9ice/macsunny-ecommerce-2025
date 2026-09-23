'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ExternalLink, Globe2, Sparkles, Volume2, VolumeX, X } from 'lucide-react';

const FRONTIER_URL = 'https://www.frontier-devconsults.com';
const VIDEO_SRC = '/frontier-devconsults-promo.mp4';

const INITIAL_DELAY_MS = 30_000;
const LONG_SESSION_MS = 30 * 60_000;
const REPEAT_IDLE_MS = 20 * 60_000;
const CHECK_INTERVAL_MS = 15_000;

const SESSION_START_KEY = 'frontier-promo-session-start-v1';
const INITIAL_SHOWN_KEY = 'frontier-promo-initial-shown-v1';

function readNumber(key: string) {
  try {
    const value = Number(sessionStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export default function FrontierPromoAd() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoBuffering, setVideoBuffering] = useState(false);
  const [needsTapToPlay, setNeedsTapToPlay] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const sessionStartRef = useRef(0);
  const initialTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const bufferingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startupFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const privateRoute =
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/service-console' ||
    pathname.startsWith('/service-console/');

  const markActivity = () => {
    lastActivityRef.current = Date.now();
  };

  const closePromo = () => {
    setOpen(false);
    markActivity();
  };

  const openFrontier = () => {
    closePromo();
    window.open(FRONTIER_URL, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    if (privateRoute) {
      setOpen(false);
      return;
    }

    const now = Date.now();
    let sessionStart = readNumber(SESSION_START_KEY);
    if (!sessionStart) {
      sessionStart = now;
      try { sessionStorage.setItem(SESSION_START_KEY, String(sessionStart)); } catch {}
    }
    sessionStartRef.current = sessionStart;
    lastActivityRef.current = now;

    const initialShown = (() => {
      try { return sessionStorage.getItem(INITIAL_SHOWN_KEY) === '1'; } catch { return false; }
    })();

    if (!initialShown) {
      const remaining = Math.max(0, INITIAL_DELAY_MS - (now - sessionStart));
      initialTimerRef.current = setTimeout(() => {
        if (document.visibilityState === 'visible') {
          try { sessionStorage.setItem(INITIAL_SHOWN_KEY, '1'); } catch {}
          setOpen(true);
        } else {
          const showWhenVisible = () => {
            if (document.visibilityState !== 'visible') return;
            document.removeEventListener('visibilitychange', showWhenVisible);
            try { sessionStorage.setItem(INITIAL_SHOWN_KEY, '1'); } catch {}
            setOpen(true);
          };
          document.addEventListener('visibilitychange', showWhenVisible);
        }
      }, remaining);
    }

    const passiveOptions: AddEventListenerOptions = { passive: true, capture: true };
    const activityEvents = ['pointerdown', 'scroll', 'touchstart', 'input'] as const;
    activityEvents.forEach((eventName) => document.addEventListener(eventName, markActivity, passiveOptions));
    document.addEventListener('keydown', markActivity, true);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') markActivity();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const repeatCheck = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || open) return;

      let initialWasShown = false;
      try { initialWasShown = sessionStorage.getItem(INITIAL_SHOWN_KEY) === '1'; } catch {}
      if (!initialWasShown) return;

      const current = Date.now();
      const longSession = current - sessionStartRef.current >= LONG_SESSION_MS;
      const genuinelyIdle = current - lastActivityRef.current >= REPEAT_IDLE_MS;

      if (longSession && genuinelyIdle) {
        setOpen(true);
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      if (initialTimerRef.current) clearTimeout(initialTimerRef.current);
      window.clearInterval(repeatCheck);
      activityEvents.forEach((eventName) => document.removeEventListener(eventName, markActivity, passiveOptions));
      document.removeEventListener('keydown', markActivity, true);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [privateRoute, open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePromo();
    };
    document.addEventListener('keydown', onEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  const attemptVideoPlay = async (userInitiated = false, nextMuted = muted) => {
    const video = videoRef.current;
    if (!video || videoFailed) return;

    video.muted = nextMuted;
    video.defaultMuted = nextMuted;

    if (userInitiated && video.readyState === HTMLMediaElement.HAVE_NOTHING) {
      video.load();
    }

    try {
      await video.play();
      setNeedsTapToPlay(false);
      setVideoBuffering(false);
    } catch {
      setVideoBuffering(false);
      setNeedsTapToPlay(true);
    }
  };

  useEffect(() => {
    if (!open || videoFailed || !videoRef.current) return;

    setVideoStarted(false);
    setNeedsTapToPlay(false);
    setVideoBuffering(true);
    void attemptVideoPlay(false, true);

    // Never leave mobile visitors trapped behind an indefinite spinner.
    // If autoplay has not actually started within a few seconds, switch to
    // an explicit user-gesture play action.
    startupFallbackTimerRef.current = setTimeout(() => {
      const video = videoRef.current;
      if (!video || !video.paused) return;
      setVideoBuffering(false);
      setNeedsTapToPlay(true);
    }, 4_000);

    return () => {
      if (startupFallbackTimerRef.current) {
        clearTimeout(startupFallbackTimerRef.current);
        startupFallbackTimerRef.current = null;
      }
    };
  }, [open, videoFailed]);

  if (privateRoute || !open) return null;

  return (
    <div
      className="fixed inset-0 z-[190] grid place-items-center bg-black/80 p-3 sm:p-6"
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="frontier-promo-title"
        className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-cyan-300/30 bg-[#050811] shadow-[0_30px_100px_rgba(0,0,0,.75)] sm:rounded-3xl"
      >
        <h2 id="frontier-promo-title" className="sr-only">Frontier DevConsults promotional message</h2>
        <button
          type="button"
          onClick={closePromo}
          aria-label="Close Frontier DevConsults promotion"
          className="absolute right-3 top-3 z-30 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/70 text-white shadow-lg transition hover:bg-black sm:right-4 sm:top-4"
        >
          <X size={21} />
        </button>

        {!videoFailed ? (
          <div
            className="relative aspect-video cursor-pointer overflow-hidden bg-black"
            onClick={openFrontier}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openFrontier();
              }
            }}
            role="link"
            tabIndex={0}
            aria-label="Visit Frontier DevConsults"
          >
            <video
              ref={videoRef}
              src={VIDEO_SRC}
              muted={muted}
              autoPlay
              loop
              playsInline
              preload="auto"
              controls={false}
              disablePictureInPicture
              onLoadStart={() => setVideoBuffering(true)}
              onCanPlay={() => {
                setVideoBuffering(false);
                if (!videoStarted) void attemptVideoPlay(false, true);
              }}
              onPlaying={() => {
                setVideoStarted(true);
                setVideoBuffering(false);
                setNeedsTapToPlay(false);
                if (startupFallbackTimerRef.current) {
                  clearTimeout(startupFallbackTimerRef.current);
                  startupFallbackTimerRef.current = null;
                }
                if (bufferingTimerRef.current) {
                  clearTimeout(bufferingTimerRef.current);
                  bufferingTimerRef.current = null;
                }
              }}
              onWaiting={() => {
                if (bufferingTimerRef.current) clearTimeout(bufferingTimerRef.current);
                bufferingTimerRef.current = setTimeout(() => setVideoBuffering(true), 700);
              }}
              onStalled={() => {
                if (videoStarted) setVideoBuffering(true);
              }}
              onError={() => {
                setVideoBuffering(false);
                setVideoFailed(true);
              }}
              className="h-full w-full object-cover"
            />

            {(videoBuffering || needsTapToPlay) && (
              <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-black/25">
                {needsTapToPlay ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setVideoBuffering(true);
                      void attemptVideoPlay(true, muted);
                    }}
                    className="pointer-events-auto rounded-full border border-white/25 bg-black/80 px-5 py-3 text-sm font-bold text-white shadow-xl backdrop-blur"
                    aria-label="Play promotional video"
                  >
                    Tap to Play
                  </button>
                ) : (
                  <div className="rounded-full border border-white/20 bg-black/65 px-4 py-2 text-xs font-semibold text-white backdrop-blur">
                    Loading video…
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                const nextMuted = !muted;
                setMuted(nextMuted);

                const video = videoRef.current;
                if (video) {
                  video.muted = nextMuted;
                  video.defaultMuted = nextMuted;
                  if (video.paused) {
                    setVideoBuffering(true);
                    void attemptVideoPlay(true, nextMuted);
                  }
                }
              }}
              className="absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-full border border-white/20 bg-black/70 px-3 py-2 text-xs font-semibold text-white backdrop-blur"
              aria-label={muted ? 'Unmute promotional video' : 'Mute promotional video'}
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              {muted ? 'Unmute' : 'Mute'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={openFrontier}
            className="group relative block aspect-video w-full overflow-hidden bg-[radial-gradient(circle_at_25%_20%,rgba(37,99,235,.34),transparent_30%),radial-gradient(circle_at_75%_30%,rgba(6,182,212,.24),transparent_28%),linear-gradient(145deg,#020617,#081426_55%,#020617)] text-left"
            aria-label="Visit Frontier DevConsults"
          >
            <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(56,189,248,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,.08)_1px,transparent_1px)] [background-size:34px_34px]" />
            <div className="absolute -left-16 top-1/4 h-44 w-44 rounded-full border border-cyan-300/25 shadow-[0_0_80px_rgba(34,211,238,.15)] sm:h-64 sm:w-64" />
            <div className="absolute -right-20 bottom-0 h-52 w-52 rounded-full border border-blue-400/20 shadow-[0_0_100px_rgba(37,99,235,.18)] sm:h-72 sm:w-72" />

            <div className="relative flex h-full flex-col justify-between p-6 sm:p-10 md:p-12">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.24em] text-cyan-300 sm:text-sm">
                <Sparkles size={17} />
                Frontier DevConsults
              </div>

              <div className="max-w-3xl">
                <h3 className="text-3xl font-black leading-tight text-white sm:text-5xl md:text-6xl">
                  Building Digital Excellence
                </h3>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-lg">
                  Web Applications • AI Solutions • Business Platforms • Custom Engineering
                </p>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-bold text-cyan-100 sm:text-sm">
                  <Globe2 size={16} />
                  frontier-devconsults.com
                </span>
                <span className="inline-flex items-center gap-2 text-xs font-bold text-white transition group-hover:text-cyan-200 sm:text-sm">
                  Visit Frontier DevConsults
                  <ExternalLink size={16} />
                </span>
              </div>
            </div>
          </button>
        )}

        <button
          type="button"
          onClick={openFrontier}
          className="flex w-full items-center justify-between gap-4 border-t border-white/10 bg-[#07111f] px-5 py-4 text-left transition hover:bg-[#0a192c] sm:px-7"
          aria-label="Visit Frontier DevConsults website"
        >
          <span>
            <span className="block text-sm font-bold text-white sm:text-base">FRONTIER DEVCONSULTS</span>
            <span className="mt-0.5 block text-xs text-slate-400 sm:text-sm">Building Digital Excellence</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 text-xs font-black text-slate-950 sm:text-sm">
            Visit Website
            <ExternalLink size={15} />
          </span>
        </button>
      </section>
    </div>
  );
}

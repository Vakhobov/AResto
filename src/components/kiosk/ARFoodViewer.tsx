import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, CheckCircle, AlertTriangle, Info, X, ZoomIn, ZoomOut, RotateCcw, Settings2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import '@google/model-viewer';
import '@/App.css';

/* ------------------------------------------------------------------ */
/*  Extended model-viewer type declarations                           */
/* ------------------------------------------------------------------ */
type ModelViewerElement = HTMLElement & {
  activateAR?: () => Promise<void> | void;
  canActivateAR?: boolean;
  getDimensions?: () => { x: number; y: number; z: number };
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<ModelViewerElement> & {
          src?: string;
          'ios-src'?: string;
          alt?: string;
          ar?: boolean;
          'ar-modes'?: string;
          'ar-scale'?: string;
          'ar-placement'?: string;
          scale?: string;
          'auto-rotate'?: boolean;
          'camera-controls'?: boolean;
          'touch-action'?: string;
          'shadow-intensity'?: string;
          'environment-image'?: string;
          exposure?: string;
          loading?: string;
          reveal?: string;
          'camera-orbit'?: string;
          'field-of-view'?: string;
          'interaction-prompt'?: string;
          'min-camera-orbit'?: string;
          'max-camera-orbit'?: string;
        },
        ModelViewerElement
      >;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Real-world target sizes (meters) — what the food should be in AR  */
/* ------------------------------------------------------------------ */
const FOOD_TARGET_METERS: Record<string, number> = {
  pizza:  0.28,   // ~28 cm diameter
  burger: 0.14,   // ~14 cm diameter
  hotdog: 0.18,
  drink:  0.08,
  cola:   0.08,
  ice:    0.08,
  soup:   0.14,
  rice:   0.16,
  salad:  0.18,
};

const getTargetMeters = (itemName: string): number => {
  const key = (itemName ?? '').toLowerCase();
  for (const [k, v] of Object.entries(FOOD_TARGET_METERS)) {
    if (key.includes(k)) return v;
  }
  return 0.16; // default 16 cm
};

/* ------------------------------------------------------------------ */
/*  Status type                                                        */
/* ------------------------------------------------------------------ */
type ModelStatus = 'loading' | 'ready' | 'error' | 'ar-started' | 'ar-tracking' | 'ar-failed';

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
interface ARFoodViewerProps {
  name: string;
  modelUrl: string;
  onClose: () => void;
}

export function ARFoodViewer({ name, modelUrl, onClose }: ARFoodViewerProps) {
  const modelViewerRef = useRef<ModelViewerElement | null>(null);
  const [status, setStatus] = useState<ModelStatus>('loading');
  const [arSupported, setArSupported] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('3D model yuklanmoqda...');
  const [computedScale, setComputedScale] = useState<number | null>(null);
  const [manualScale, setManualScale] = useState<number>(1.0);
  const [showControls, setShowControls] = useState<boolean>(false);

  /* ---- apply manual scale on top of computed scale ---- */
  const applyScale = useCallback((base: number, factor: number) => {
    const mv = modelViewerRef.current as any;
    if (!mv) return;
    const s = base * factor;
    mv.setAttribute('scale', `${s} ${s} ${s}`);
  }, []);

  useEffect(() => {
    if (computedScale !== null) {
      applyScale(computedScale, manualScale);
    }
  }, [manualScale, computedScale, applyScale]);

  const changeScale = (delta: number) => {
    setManualScale(prev => Math.max(0.1, Math.min(10, parseFloat((prev + delta).toFixed(2)))));
  };

  const resetScale = () => setManualScale(1.0);

  /* ---- event listeners ---- */
  useEffect(() => {
    const mv = modelViewerRef.current as any;
    if (!mv) return;

    const onLoad = () => {
      // --- Auto-scale: detect natural model size → compute correct real-world scale ---
      if (typeof mv.getDimensions === 'function') {
        // Step 1: reset to natural size so getDimensions() returns true GLTF meters
        mv.setAttribute('scale', '1 1 1');

        // Step 2: read bounding box (in meters at scale=1)
        const dims: { x: number; y: number; z: number } = mv.getDimensions();
        const maxDim = Math.max(dims.x ?? 0, dims.y ?? 0, dims.z ?? 0);

        if (maxDim > 0.0001) {
          const targetMeters = getTargetMeters(name);
          // clamp between very small (0.001) and very large (500) to avoid invisible/room-sized models
          const s = Math.max(0.001, Math.min(500, targetMeters / maxDim));
          mv.setAttribute('scale', `${s} ${s} ${s}`);
          setComputedScale(s);
          console.log(
            `[AR] ${name} | natural=${maxDim.toFixed(3)} m | target=${targetMeters} m | scale=${s.toFixed(5)}`
          );
        } else {
          console.warn('[AR] getDimensions() returned zero — using fallback scale');
          mv.setAttribute('scale', '1 1 1');
        }
      } else {
        // Fallback: getDimensions() not available, keep initial scale attribute
        console.warn('[AR] getDimensions() not available on this model-viewer version');
      }

      setStatus('ready');
      setStatusMessage('3D model tayyor');
      setTimeout(() => setArSupported(!!mv.canActivateAR), 400);
    };

    const onError = () => {
      setStatus('error');
      setStatusMessage("3D model fayli topilmadi yoki qo'llab-quvvatlanmaydi");
    };

    const onArStatus = (event: Event) => {
      const { status: s } = (event as CustomEvent).detail ?? {};
      if (s === 'session-started') {
        setStatus('ar-started');
        setStatusMessage('Kamerani stolga qarating — tekis yuzani skan qiling');
      } else if (s === 'object-placed') {
        setStatus('ar-tracking');
        setStatusMessage('Model joylashtirildi — atrofida aylanib ko\'ring');
      } else if (s === 'failed') {
        setStatus('ar-failed');
        setStatusMessage('AR ishlamadi — 3D ko\'rinish davom etadi');
      } else if (s === 'not-presenting') {
        setStatus('ready');
        setStatusMessage('3D model tayyor');
      }
    };

    mv.addEventListener('load', onLoad);
    mv.addEventListener('error', onError);
    mv.addEventListener('ar-status', onArStatus);

    return () => {
      mv.removeEventListener('load', onLoad);
      mv.removeEventListener('error', onError);
      mv.removeEventListener('ar-status', onArStatus);
    };
  }, [modelUrl, name]);

  /* ---- status indicator helpers ---- */
  const statusIcon = () => {
    switch (status) {
      case 'loading':
        return <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />;
      case 'ready':
      case 'ar-started':
      case 'ar-tracking':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'error':
      case 'ar-failed':
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
    }
  };

  const statusColor = () => {
    switch (status) {
      case 'loading':     return 'border-blue-500/30 bg-blue-500/10 text-blue-200';
      case 'ready':       return 'border-green-500/30 bg-green-500/10 text-green-200';
      case 'error':       return 'border-red-500/30 bg-red-500/10 text-red-200';
      case 'ar-started':
      case 'ar-tracking': return 'border-green-500/30 bg-green-500/10 text-green-200';
      case 'ar-failed':   return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-background flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      {/* ---- Header ---- */}
      <header className="flex items-center justify-between gap-4 border-b border-border bg-card/70 px-4 py-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-11 w-11 shrink-0 rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-foreground md:text-2xl">{name}</h2>
            <p className="text-sm text-muted-foreground">3D / AR food preview</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-11 w-11 shrink-0 rounded-full">
          <X className="h-5 w-5" />
        </Button>
      </header>

      {/* ---- Main content ---- */}
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto flex min-h-full max-w-4xl flex-col gap-4">

          {/* ---- model-viewer ---- */}
          <section className="relative min-h-[420px] flex-1 overflow-hidden rounded-3xl border border-border bg-card shadow-card">
            <model-viewer
              ref={modelViewerRef}
              src={modelUrl}
              alt={`${name} 3D model`}
              ar
              ar-modes="webxr scene-viewer quick-look"
              ar-placement="floor"
              ar-scale="fixed"
              scale="1 1 1"
              camera-controls
              auto-rotate
              touch-action="pan-y"
              shadow-intensity="1"
              environment-image="neutral"
              exposure="1"
              interaction-prompt="auto"
              loading="eager"
              reveal="auto"
              className="ar-food-viewer__model"
            >
              <button
                type="button"
                slot="ar-button"
                className="ar-food-viewer__ar-btn"
              >
                📱 AR'da stol ustida ko'rish
              </button>
            </model-viewer>

            {/* 3D Badge */}
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-primary/90 px-3 py-1.5 text-primary-foreground backdrop-blur-sm">
              <Camera className="h-4 w-4" />
              <span className="text-xs font-semibold">3D / AR</span>
            </div>

            {/* Toggle controls button */}
            {status === 'ready' && (
              <button
                type="button"
                onClick={() => setShowControls(p => !p)}
                className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-white backdrop-blur-sm text-xs font-semibold hover:bg-black/80 transition-colors"
              >
                <Settings2 className="h-3.5 w-3.5" />
                O'lcham
              </button>
            )}

            {/* Scale controls overlay */}
            {status === 'ready' && showControls && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 rounded-2xl bg-black/70 backdrop-blur-sm px-5 py-4 text-white min-w-[240px]">
                <p className="text-xs font-semibold opacity-70 uppercase tracking-wide">Model o'lchami</p>
                <div className="flex items-center gap-3 w-full">
                  <button
                    type="button"
                    title="Kichiklashtirish"
                    onClick={() => changeScale(-0.1)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 transition-colors"
                  >
                    <ZoomOut className="h-5 w-5" />
                  </button>
                  <input
                    type="range"
                    title="Model o'lchami"
                    aria-label="Model o'lchami"
                    min={0.1}
                    max={5}
                    step={0.05}
                    value={manualScale}
                    onChange={e => setManualScale(parseFloat(e.target.value))}
                    className="flex-1 accent-primary cursor-pointer"
                  />
                  <button
                    type="button"
                    title="Kattalashtirish"
                    onClick={() => changeScale(0.1)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 transition-colors"
                  >
                    <ZoomIn className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs opacity-60">
                    {manualScale === 1.0 ? 'Standart o\'lcham' : `×${manualScale.toFixed(2)}`}
                  </span>
                  <button
                    type="button"
                    onClick={resetScale}
                    className="flex items-center gap-1 rounded-full bg-white/20 hover:bg-white/30 px-3 py-1 text-xs transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Qayta tiklash
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ---- Status message ---- */}
          <div className={`flex items-center gap-3 rounded-2xl border p-4 text-sm ${statusColor()}`}>
            {statusIcon()}
            <span>{statusMessage}</span>
          </div>

          {/* ---- AR support info ---- */}
          {arSupported === false && (
            <div className="flex items-start gap-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">AR bu qurilma/brauzerda qo'llab-quvvatlanmaydi</p>
                <p className="mt-1 opacity-80">
                  AR works best on Android (ARCore) or iPhone/iPad (ARKit). 3D preview is available above.
                </p>
              </div>
            </div>
          )}

          {arSupported === true && (
            <div className="flex items-start gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-200">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">AR tayyor! "AR'da stol ustida ko'rish" tugmasini bosing</p>
                <p className="mt-1 opacity-80">
                  Kamerani stolga qarating → tekis yuzani skan qiling → taomni stol ustiga qo'ying → atrofida aylanib ko'ring.
                </p>
              </div>
            </div>
          )}

          {/* ---- Developer / calibration notes ---- */}
          <details className="rounded-2xl border border-border bg-card/50 p-4 text-sm text-muted-foreground">
            <summary className="cursor-pointer font-semibold text-foreground">
              ℹ️ AR o'lcham kalibratsiyasi (developer info)
            </summary>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs leading-relaxed">
              <li>
                <strong>Auto-scale:</strong> model yuklanganida <code>getDimensions()</code> orqali tabiiy o'lcham aniqlanadi va
                maqsad o'lchamga (burger: 14cm, pizza: 28cm) mos scale hisoblanadi.
              </li>
              {computedScale !== null && (
                <li>
                  <strong>Hisoblangan scale ({name}):</strong>{' '}
                  <code>{computedScale.toFixed(5)}</code> — maqsad: {(getTargetMeters(name) * 100).toFixed(0)} cm
                </li>
              )}
              <li>
                Agar AR'da taom hali ham katta/kichik ko'rinsa — <code>FOOD_TARGET_METERS</code>dagi qiymatlarni{' '}
                <code>ARFoodViewer.tsx</code>da sozlang.
              </li>
              <li>AR requires <strong>HTTPS</strong> or <code>localhost</code>. Deploy to Vercel for full AR testing.</li>
              <li>On iOS, <code>.usdz</code> format gives best AR accuracy with Quick Look.</li>
              <li>
                <strong>Scene Viewer (Android)</strong>: model-viewer passes the computed <code>scale</code> param
                to Scene Viewer automatically via the intent URL.
              </li>
            </ul>
          </details>

        </div>
      </main>
    </motion.div>
  );
}

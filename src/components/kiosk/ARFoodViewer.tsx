import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import '@google/model-viewer';

/* ------------------------------------------------------------------ */
/*  Extended model-viewer type declarations                           */
/* ------------------------------------------------------------------ */
type ModelViewerElement = HTMLElement & {
  activateAR?: () => Promise<void> | void;
  canActivateAR?: boolean;
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
/*  Status type                                                       */
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
  const modelRootRef = useRef<any>(null);
  const [status, setStatus] = useState<ModelStatus>('loading');
  const [arSupported, setArSupported] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('3D model yuklanmoqda...');

  const getArScale = (itemName: string) => {
    const key = itemName?.toLowerCase() || '';
    if (key.includes('pizza')) return 0.22;
    if (key.includes('burger')) return 0.16;
    if (key.includes('drink') || key.includes('cola') || key.includes('ice')) return 0.12;
    return 0.18;
  };
  const arScale = getArScale(name);

  /* ---- attach event listeners on mount ---- */
  useEffect(() => {
    const mv = modelViewerRef.current;
    if (!mv) return;

    const onLoad = () => {
      console.log('[AR] ✅ Model loaded:', modelUrl);
      setStatus('ready');
      setStatusMessage('3D model tayyor / 3D model ready');

      // Check AR support after model loads
      // model-viewer exposes canActivateAR after the model is loaded
      setTimeout(() => {
        if (mv.canActivateAR) {
          setArSupported(true);
          console.log('[AR] ✅ AR is supported on this device');
        } else {
          setArSupported(false);
          console.log('[AR] ⚠️ AR is NOT supported on this device/browser');
        }
      }, 500);

      // After model loads, normalize scale & pivot so models appear realistic in AR
      try {
        // small timeout to allow internal model-viewer model to initialize
        setTimeout(() => {
          normalizeAndPrepareModel(mv, name);
        }, 200);
      } catch (e) {
        console.warn('[AR] normalization failed', e);
      }
    };

    const onError = (event: Event) => {
      console.error('[AR] ❌ Model error:', event);
      setStatus('error');
      setStatusMessage('3D model fayli topilmadi yoki qo\'llab-quvvatlanmaydi / 3D model file not found or unsupported');
    };

    const onArStatus = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      console.log('[AR] 📱 AR status:', detail);

      if (detail.status === 'session-started') {
        setStatus('ar-started');
        setStatusMessage('Kamerani stolga qarating — stolni skan qiling / Point camera at your table');
      } else if (detail.status === 'object-placed') {
        setStatus('ar-tracking');
        setStatusMessage('Model joylashtirildi / Model placed');
      } else if (detail.status === 'failed') {
        setStatus('ar-failed');
        setStatusMessage('AR ishlamadi / AR failed — 3D ko\'rish davom etadi');
      } else if (detail.status === 'not-presenting') {
        console.log('[AR] AR session ended (not-presenting)');
        setStatus('ready');
        setStatusMessage('3D model tayyor / 3D model ready');
      }
    };

    const onArTracking = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      console.log('[AR] 🎯 AR tracking:', detail);

      // smoothing + stable anchor persistence
      try {
        const root = modelRootRef.current;
        if (!root) return;
        // detail may contain position as [x,y,z] or a Vector3-like
        const posArr = detail?.position || detail?.pose?.position || null;
        if (posArr && Array.isArray(posArr) && posArr.length >= 3) {
          const target = { x: posArr[0], y: posArr[1], z: posArr[2] };
          // simple exponential smoothing
          root.__lastPos = root.__lastPos || { x: target.x, y: target.y, z: target.z };
          const alpha = 0.2; // smoothing factor
          root.__lastPos.x += (target.x - root.__lastPos.x) * alpha;
          root.__lastPos.y += (target.y - root.__lastPos.y) * alpha;
          root.__lastPos.z += (target.z - root.__lastPos.z) * alpha;
          if (root.position && typeof root.position.set === 'function') {
            root.position.set(root.__lastPos.x, root.__lastPos.y + 0.005, root.__lastPos.z);
          }
          console.log('[AR] placement coords (smoothed):', root.__lastPos);
        }
        if (detail?.plane || detail?.planeType) {
          console.log('[AR] detected plane:', detail.plane || detail.planeType);
        }
      } catch (e) {
        console.warn('[AR] tracking smoothing error', e);
      }
    };

    mv.addEventListener('load', onLoad);
    mv.addEventListener('error', onError);
    mv.addEventListener('ar-status', onArStatus);
    mv.addEventListener('ar-tracking', onArTracking);

    return () => {
      mv.removeEventListener('load', onLoad);
      mv.removeEventListener('error', onError);
      mv.removeEventListener('ar-status', onArStatus);
      mv.removeEventListener('ar-tracking', onArTracking);
    };
  }, [modelUrl]);

  /* ---- model normalization and AR helpers ---- */
  const normalizeAndPrepareModel = (mv: ModelViewerElement, itemName: string) => {
    const three = (window as any).THREE || (window as any).three;
    // try to reach into model-viewer internals to access the scene root
    const modelRoot = (mv as any).model?.scene || (mv as any).model?.model?.scene || (mv as any).model;
    if (!modelRoot) {
      console.warn('[AR] model root not available for normalization');
      return;
    }
    // keep a reference for tracking smoothing
    modelRootRef.current = modelRoot;

    let boxMin: any = null;
    let boxMax: any = null;
    let size = { x: 0, y: 0, z: 0 };

    try {
      if (three && three.Box3) {
        const Box3 = three.Box3;
        const vec3 = three.Vector3;
        const box = new Box3().setFromObject(modelRoot);
        boxMin = box.min;
        boxMax = box.max;
        const sVec = box.getSize(new vec3());
        size = { x: sVec.x, y: sVec.y, z: sVec.z };
      } else {
        // fallback: traverse meshes and compute AABB from geometry attributes
        const mins = [Infinity, Infinity, Infinity];
        const maxs = [-Infinity, -Infinity, -Infinity];
        modelRoot.traverse?.((child: any) => {
          if (child.isMesh && child.geometry && child.geometry.attributes && child.geometry.attributes.position) {
            const pos = child.geometry.attributes.position.array;
            for (let i = 0; i < pos.length; i += 3) {
              mins[0] = Math.min(mins[0], pos[i]);
              mins[1] = Math.min(mins[1], pos[i + 1]);
              mins[2] = Math.min(mins[2], pos[i + 2]);
              maxs[0] = Math.max(maxs[0], pos[i]);
              maxs[1] = Math.max(maxs[1], pos[i + 1]);
              maxs[2] = Math.max(maxs[2], pos[i + 2]);
            }
          }
        });
        boxMin = { x: mins[0], y: mins[1], z: mins[2] };
        boxMax = { x: maxs[0], y: maxs[1], z: maxs[2] };
        size = { x: boxMax.x - boxMin.x, y: boxMax.y - boxMin.y, z: boxMax.z - boxMin.z };
      }

      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      // target largest dimension in meters (0.15 - 0.22 m)
      const targetMeters = 0.18;
      const scaleFactor = targetMeters / maxDim;

      // apply a reasonable default multiplier for certain items
      const defaults: Record<string, number> = {
        burger: 0.15,
        pizza: 0.25,
        drink: 0.12,
      };
      let itemScale = scaleFactor;
      const key = itemName?.toLowerCase() || '';
      for (const k of Object.keys(defaults)) {
        if (key.includes(k)) {
          itemScale = defaults[k];
          break;
        }
      }

      // Limit the applied scale so we don't create giant or tiny results
      const finalScale = Math.max(0.02, Math.min(4.0, itemScale));

      // set scale on the scene root if available
      try {
        if (modelRoot.scale && typeof modelRoot.scale.set === 'function') {
          modelRoot.scale.set(finalScale, finalScale, finalScale);
        } else if (mv.setAttribute) {
          mv.setAttribute('scale', `${finalScale} ${finalScale} ${finalScale}`);
        }
      } catch (e) {
        console.warn('[AR] could not set scale on model root', e);
      }

      // move model so its bottom sits at y=0 (surface)
      const minY = boxMin?.y ?? 0;
      const yOffset = -minY * finalScale;
      try {
        if (modelRoot.position && typeof modelRoot.position.set === 'function') {
          modelRoot.position.set(0, yOffset + 0.005, 0); // slight lift to prevent clipping
        }
      } catch (e) {
        console.warn('[AR] could not set position on model root', e);
      }

      console.log('[AR] model normalized', { size, maxDim, finalScale, yOffset });
    } catch (e) {
      console.warn('[AR] normalization error', e);
    }

    // add basic gesture controls (rotate + pinch scale)
    try {
      setupGestureControls(mv, modelRoot);
    } catch (e) {
      console.warn('[AR] gesture setup failed', e);
    }
  };

  const setupGestureControls = (mv: any, modelRoot: any) => {
    if (!mv) return;
    const pointers: Record<number, PointerEvent> = {};
    let lastRotationY = 0;
    let basePinchDistance = 0;
    let baseScale = modelRoot?.scale?.x || 1;

    const getDistance = (a: PointerEvent, b: PointerEvent) => {
      const dx = a.clientX - b.clientX;
      const dy = a.clientY - b.clientY;
      return Math.hypot(dx, dy);
    };

    const onPointerDown = (e: PointerEvent) => {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      pointers[e.pointerId] = e;
      if (Object.keys(pointers).length === 1) {
        lastRotationY = e.clientX;
      } else if (Object.keys(pointers).length === 2) {
        const ids = Object.keys(pointers).map((k) => Number(k));
        basePinchDistance = getDistance(pointers[ids[0]], pointers[ids[1]]);
        baseScale = modelRoot?.scale?.x || 1;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pointers[e.pointerId]) return;
      // update stored pointer
      pointers[e.pointerId] = e;
      const count = Object.keys(pointers).length;
      if (count === 1) {
        // rotate model around Y
        const dx = e.clientX - lastRotationY;
        lastRotationY = e.clientX;
        const rot = (modelRoot.rotation?.y ?? 0) + dx * 0.005;
        if (modelRoot.rotation && typeof modelRoot.rotation.set === 'function') {
          modelRoot.rotation.set(modelRoot.rotation.x || 0, rot, modelRoot.rotation.z || 0);
        } else {
          modelRoot.rotation = { ...(modelRoot.rotation || {}), y: rot };
        }
      } else if (count === 2) {
        const ids = Object.keys(pointers).map((k) => Number(k));
        const d = getDistance(pointers[ids[0]], pointers[ids[1]]);
        if (basePinchDistance > 0) {
          const factor = d / basePinchDistance;
          let newScale = baseScale * factor;
          // clamp scale
          newScale = Math.max(0.7 * baseScale, Math.min(1.4 * baseScale, newScale));
          if (modelRoot.scale && typeof modelRoot.scale.set === 'function') {
            modelRoot.scale.set(newScale, newScale, newScale);
          }
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      delete pointers[e.pointerId];
      try {
        (e.target as Element).releasePointerCapture?.(e.pointerId);
      } catch {
        // Pointer capture may already be released by the browser.
      }
    };

    mv.addEventListener('pointerdown', onPointerDown as any);
    mv.addEventListener('pointermove', onPointerMove as any);
    window.addEventListener('pointerup', onPointerUp as any);
  };

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
      case 'loading': return 'border-blue-500/30 bg-blue-500/10 text-blue-200';
      case 'ready': return 'border-green-500/30 bg-green-500/10 text-green-200';
      case 'error': return 'border-red-500/30 bg-red-500/10 text-red-200';
      case 'ar-started':
      case 'ar-tracking': return 'border-green-500/30 bg-green-500/10 text-green-200';
      case 'ar-failed': return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-background flex flex-col"
      onClick={(event) => event.stopPropagation()}
    >
      {/* ---- Header ---- */}
      <header className="flex items-center justify-between gap-4 border-b border-border bg-card/70 px-4 py-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-11 w-11 shrink-0 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-foreground md:text-2xl">{name}</h2>
            <p className="text-sm text-muted-foreground">3D / AR food preview</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-11 w-11 shrink-0 rounded-full"
        >
          <X className="h-5 w-5" />
        </Button>
      </header>

      {/* ---- Main content ---- */}
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto flex min-h-full max-w-4xl flex-col gap-4">

          {/* ---- model-viewer with native AR ---- */}
          <section className="relative min-h-[420px] flex-1 overflow-hidden rounded-3xl border border-border bg-card shadow-card">
            <model-viewer
              ref={modelViewerRef}
              src={modelUrl}
              alt={`${name} 3D model`}
              ar
              ar-modes="webxr scene-viewer quick-look"
              ar-placement="floor"
              ar-scale="fixed"
              scale={`${arScale} ${arScale} ${arScale}`}
              camera-controls
              auto-rotate
              touch-action="pan-y"
              shadow-intensity="1"
              environment-image="neutral"
              exposure="1"
              interaction-prompt="auto"
              loading="eager"
              reveal="auto"
              style={{ width: '100%', height: 'min(68vh, 620px)', minHeight: 420 }}
            >
              {/* ---- AR button INSIDE model-viewer (slot="ar-button") ---- */}
              <button
                slot="ar-button"
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '100px',
                  backgroundColor: '#f97316',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '15px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(249, 115, 22, 0.4)',
                  zIndex: 10,
                }}
              >
                📱 AR'da stol ustida ko'rish
              </button>
            </model-viewer>

            {/* 3D Badge */}
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-primary/90 px-3 py-1.5 text-primary-foreground backdrop-blur-sm">
              <Camera className="h-4 w-4" />
              <span className="text-xs font-semibold">3D / AR</span>
            </div>
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
                  AR is not supported on this device/browser, but 3D preview is available above.
                  AR works best on a real Android device with ARCore or iPhone/iPad with ARKit.
                </p>
              </div>
            </div>
          )}

          {arSupported === true && (
            <div className="flex items-start gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-200">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">AR tayyor! Yuqoridagi "AR'da stol ustida ko'rish" tugmasini bosing</p>
                <p className="mt-1 opacity-80">
                  Kamerani stolga qarating, bir necha soniya kuting, so'ng aniqlangan yuzaga bosing.
                </p>
              </div>
            </div>
          )}

          {/* ---- Developer / testing notes ---- */}
          <details className="rounded-2xl border border-border bg-card/50 p-4 text-sm text-muted-foreground">
            <summary className="cursor-pointer font-semibold text-foreground">
              ℹ️ AR testing notes (developer info)
            </summary>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs leading-relaxed">
              <li>AR works best on a real Android device with ARCore or iPhone/iPad with ARKit.</li>
              <li>AR may not work on desktop browsers (no camera AR support).</li>
              <li>For mobile camera AR, the app must be served from <strong>HTTPS</strong> or <code>localhost</code>.</li>
              <li>If testing on a tablet via local network IP (e.g. <code>http://192.168.x.x:5173</code>), WebXR will fail unless HTTPS is used.</li>
              <li>Deploy to <strong>Vercel</strong> or <strong>Firebase Hosting</strong> for full AR testing.</li>
              <li>On Android, Scene Viewer opens AR with <code>.glb</code> files automatically.</li>
              <li>On iOS/iPadOS, Quick Look prefers <code>.usdz</code> files. Without a <code>.usdz</code>, AR may fall back to 3D-only on iOS.</li>
            </ul>
          </details>

        </div>
      </main>
    </motion.div>
  );
}

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Play,
  Square,
  TrendingUp,
  ShoppingBag,
  CreditCard,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useShift } from '@/context/ShiftContext';
import { openShift, closeShift, Shift } from '@/services/shiftService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/currency';

/* ─── helpers ──────────────────────────────────────────── */

const formatDuration = (from: Date): string => {
  const ms = Date.now() - from.getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const formatTime = (d: Date) =>
  d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

const formatDate = (d: Date) =>
  d.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' });

/* ─── summary modal ────────────────────────────────────── */

interface SummaryModalProps {
  shift: Shift;
  onClose: () => void;
}

const SummaryModal: React.FC<SummaryModalProps> = ({ shift, onClose }) => {
  const topItems = Object.entries(shift.soldItemsSummary)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  const paymentEntries = Object.entries(shift.paymentSummary).filter(([, v]) => v > 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 16 }}
        transition={{ type: 'spring', duration: 0.35 }}
        className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">Smena xulosasi</h2>
            <p className="text-xs text-muted-foreground">
              {formatDate(shift.openedAt)} · {formatTime(shift.openedAt)}
              {shift.closedAt ? ` → ${formatTime(shift.closedAt)}` : ' → hozir'}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Jami daromad</p>
              <p className="text-2xl font-bold text-primary">{formatPrice(shift.totalRevenue)}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Buyurtmalar</p>
              <p className="text-2xl font-bold text-foreground">{shift.totalOrders}</p>
            </div>
          </div>

          {/* Payment breakdown */}
          {paymentEntries.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                To'lov usullari
              </h3>
              <div className="space-y-2">
                {paymentEntries.map(([method, amount]) => (
                  <div key={method} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground capitalize">{method}</span>
                    <span className="font-semibold text-foreground">{formatPrice(amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top sold items */}
          {topItems.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                Sotilgan mahsulotlar
              </h3>
              <div className="space-y-2">
                {topItems.map(([name, qty], i) => (
                  <div key={name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                      <span className="text-foreground">{name}</span>
                    </div>
                    <span className="font-semibold text-foreground">{qty} ta</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {shift.notes && (
            <div className="bg-secondary/30 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Izoh: {shift.notes}</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ─── main component ───────────────────────────────────── */

interface ShiftPanelProps {
  branchId: string | null;
}

export const ShiftPanel: React.FC<ShiftPanelProps> = ({ branchId }) => {
  const { activeShift, shiftLoading, isOpen } = useShift();
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryShift, setSummaryShift] = useState<Shift | null>(null);
  const [closeNotes, setCloseNotes] = useState('');

  const [, forceRender] = useState(0);
  // Tick every minute so "duration" stays fresh
  useEffect(() => {
    const t = setInterval(() => forceRender(n => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const handleOpen = useCallback(async () => {
    if (!branchId) {
      toast({ title: 'Xato', description: 'Filial ID topilmadi', variant: 'destructive' });
      return;
    }
    setOpening(true);
    try {
      await openShift({ branchId, openedBy: userProfile?.email ?? 'Admin' });
      toast({ title: 'Smena ochildi ✅', description: 'Buyurtmalar qabul qilinmoqda.' });
    } catch (err) {
      toast({ title: 'Xato', description: String(err), variant: 'destructive' });
    } finally {
      setOpening(false);
    }
  }, [branchId, userProfile?.email, toast]);

  const handleClose = useCallback(async () => {
    if (!activeShift) return;
    setClosing(true);
    try {
      const closedBy = userProfile?.email ?? 'Admin';
      const closedAt = new Date();
      await closeShift(activeShift.id, closedBy, closeNotes || undefined);
      setSummaryShift({
        ...activeShift,
        status: 'closed',
        closedBy,
        closedAt,
        notes: closeNotes || activeShift.notes,
      });
      setShowSummary(true);
      setCloseNotes('');
      toast({ title: 'Smena yopildi ✅', description: 'Smena xulosasi tayyor.' });
    } catch (err) {
      toast({ title: 'Xato', description: String(err), variant: 'destructive' });
    } finally {
      setClosing(false);
    }
  }, [activeShift, userProfile?.email, closeNotes, toast]);

  if (shiftLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Smena holati yuklanmoqda...</span>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        {/* Status row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                isOpen
                  ? 'bg-green-500/15 border border-green-500/30'
                  : 'bg-red-500/15 border border-red-500/30'
              }`}
            >
              {isOpen ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">
                {isOpen ? 'Smena ochiq' : 'Smena yopiq'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isOpen && activeShift
                  ? `${formatTime(activeShift.openedAt)} dan · ${formatDuration(activeShift.openedAt)}`
                  : 'Buyurtmalar qabul qilinmaydi'}
              </p>
            </div>
          </div>

          {/* Live stats when open */}
          {isOpen && activeShift && (
            <div className="hidden sm:flex items-center gap-4 text-right">
              <div>
                <p className="text-xs text-muted-foreground">Daromad</p>
                <p className="text-sm font-bold text-primary">{formatPrice(activeShift.totalRevenue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Buyurtmalar</p>
                <p className="text-sm font-bold text-foreground">{activeShift.totalOrders}</p>
              </div>
            </div>
          )}
        </div>

        {/* Metrics row on mobile when open */}
        {isOpen && activeShift && (
          <div className="sm:hidden grid grid-cols-2 gap-3">
            <div className="bg-primary/10 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Daromad</p>
              <p className="text-base font-bold text-primary">{formatPrice(activeShift.totalRevenue)}</p>
            </div>
            <div className="bg-secondary/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Buyurtmalar</p>
              <p className="text-base font-bold text-foreground">{activeShift.totalOrders}</p>
            </div>
          </div>
        )}

        {/* Close notes input */}
        {isOpen && (
          <input
            type="text"
            placeholder="Yopish izohi (ixtiyoriy)..."
            value={closeNotes}
            onChange={e => setCloseNotes(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {!isOpen ? (
            <Button
              id="shift-open-btn"
              className="flex-1 gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white"
              onClick={handleOpen}
              disabled={opening}
            >
              {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Smena ochish
            </Button>
          ) : (
            <>
              <Button
                id="shift-close-btn"
                variant="destructive"
                className="flex-1 gap-2 rounded-xl"
                onClick={handleClose}
                disabled={closing}
              >
                {closing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                Smena yopish
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl shrink-0"
                onClick={() => {
                  setSummaryShift(activeShift);
                  setShowSummary(true);
                }}
                title="Xulosa ko'rish"
              >
                <TrendingUp className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary modal – shows for activeShift while open, or last shift data if just closed */}
      <AnimatePresence>
        {showSummary && summaryShift && (
          <SummaryModal shift={summaryShift} onClose={() => setShowSummary(false)} />
        )}
      </AnimatePresence>
    </>
  );
};

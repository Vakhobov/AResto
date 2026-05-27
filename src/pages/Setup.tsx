/**
 * Setup.tsx  — Supabase version
 * ──────────────────────────────
 * One-time SuperAdmin seeding via /api/admin-users.
 * Visit /setup to create superadmin@aresto.com
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type State = 'idle' | 'loading' | 'done' | 'exists' | 'error';

const SUPERADMIN_EMAIL    = 'superadmin@aresto.com';
const SUPERADMIN_PASSWORD = 'Admin1234!';

const Setup = () => {
  const navigate = useNavigate();
  const [state, setState]     = useState<State>('idle');
  const [message, setMessage] = useState('');

  const handleSetup = async () => {
    setState('loading');
    try {
      const res = await fetch('/api/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'seedSuperAdmin',
          email: SUPERADMIN_EMAIL,
          password: SUPERADMIN_PASSWORD,
        }),
      });

      let result;
      try {
        result = await res.json();
      } catch (e) {
        throw new Error(`API ishlamayapti (HTTP ${res.status}). Iltimos, terminalni to'xtatib "npm run dev:full" komandasi orqali qayta ishga tushiring.`);
      }

      if (!res.ok) throw new Error(result?.error ?? `HTTP ${res.status}`);

      if (result?.exists) {
        setState('exists');
        setMessage('SuperAdmin allaqachon mavjud. Kirish sahifasiga qayting va kiring.');
      } else {
        setState('done');
        setMessage('SuperAdmin muvaffaqiyatli yaratildi! Endi kirish sahifasiga oʻting.');
      }
    } catch (err: any) {
      setState('error');
      setMessage(err?.message ?? 'Noma\'lum xato yuz berdi');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">SuperAdmin Setup</h1>
          <p className="text-muted-foreground mt-1 text-sm text-center">
            Birinchi marta ishga tushirishda SuperAdmin akkauntini yarating
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg space-y-5">
          <div className="bg-secondary/30 border border-border rounded-xl p-4 space-y-2 text-sm">
            <p className="font-medium text-foreground">Yaratilajak akkaunt:</p>
            <div className="flex justify-between text-muted-foreground">
              <span>Email:</span>
              <span className="font-mono text-foreground">{SUPERADMIN_EMAIL}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Parol:</span>
              <span className="font-mono text-foreground">{SUPERADMIN_PASSWORD}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Rol:</span>
              <span className="text-primary font-medium">SuperAdmin</span>
            </div>
          </div>

          {(state === 'done' || state === 'exists' || state === 'error') && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl p-4 text-sm flex items-start gap-3 ${
                state === 'error'
                  ? 'bg-destructive/10 text-destructive border border-destructive/20'
                  : 'bg-green-500/10 text-green-400 border border-green-500/20'
              }`}
            >
              {state !== 'error' && <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />}
              <p>{message}</p>
            </motion.div>
          )}

          <Button
            id="setup-btn"
            className="w-full h-11 rounded-xl gap-2 bg-primary hover:bg-primary/90"
            onClick={handleSetup}
            disabled={state === 'loading' || state === 'done'}
          >
            {state === 'loading'
              ? <><Loader2 className="h-4 w-4 animate-spin" />Yaratilmoqda...</>
              : state === 'done'
              ? <><CheckCircle2 className="h-4 w-4" />Yaratildi!</>
              : <><ShieldCheck className="h-4 w-4" />SuperAdmin yaratish</>}
          </Button>

          {(state === 'done' || state === 'exists') && (
            <Button
              variant="outline"
              className="w-full h-11 rounded-xl gap-2"
              onClick={() => navigate('/login')}
            >
              <ArrowLeft className="h-4 w-4" />
              Kirish sahifasiga o'tish
            </Button>
          )}

          {(state === 'idle' || state === 'error') && (
            <button
              onClick={() => navigate('/login')}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Orqaga
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Setup;

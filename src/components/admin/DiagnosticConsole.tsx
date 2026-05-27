import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, ShieldAlert, Check, RefreshCw, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useShift } from '@/context/ShiftContext';
import { supabase } from '@/lib/supabase';

interface LogEntry {
  type: 'log' | 'warn' | 'error';
  message: string;
  timestamp: Date;
}

export const DiagnosticConsole: React.FC = () => {
  const { userProfile } = useAuth();
  const { activeShift, shiftLoading, shiftError } = useShift();
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [dbErrorMsg, setDbErrorMsg] = useState<string | null>(null);

  // Capture console logs dynamically
  useEffect(() => {
    const handleLog = (type: 'log' | 'warn' | 'error', originalFn: (...args: any[]) => void) => {
      return (...args: any[]) => {
        const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
        setLogs(prev => [{ type, message: msg, timestamp: new Date() }, ...prev].slice(0, 30));
        originalFn(...args);
      };
    };

    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = handleLog('log', originalLog);
    console.warn = handleLog('warn', originalWarn);
    console.error = handleLog('error', originalError);

    // Initial log
    console.log('[Diagnostic] Console hooks activated successfully.');

    // Test Supabase connection
    const testConnection = async () => {
      try {
        const { data, error } = await supabase.from('branches').select('count', { count: 'exact', head: true });
        if (error) throw error;
        setDbStatus('connected');
      } catch (err: any) {
        console.error('[Diagnostic] Supabase connection test failed:', err);
        setDbStatus('error');
        setDbErrorMsg(err.message || String(err));
      }
    };
    testConnection();

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-lg w-full px-4 sm:px-0">
      <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[400px]">
        {/* Toggle Header */}
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="bg-secondary/50 hover:bg-secondary/80 px-4 py-2.5 flex items-center justify-between cursor-pointer select-none border-b border-border"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Terminal className="h-4 w-4 text-primary animate-pulse" />
            <span>AResto Tizim Diagnostikasi</span>
            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
              dbStatus === 'connected' ? 'bg-green-500/10 text-green-500' :
              dbStatus === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'
            }`}>
              {dbStatus === 'connected' ? 'DB Ulandi' : dbStatus === 'error' ? 'DB Xato' : 'DB Tekshiruv...'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {logs.filter(l => l.type === 'error').length > 0 && (
              <span className="text-[10px] text-red-500 flex items-center gap-0.5">
                <ShieldAlert className="h-3 w-3" />
                {logs.filter(l => l.type === 'error').length} ta xato
              </span>
            )}
            {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>

        {/* Console Body */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="flex flex-col overflow-hidden"
            >
              {/* Status Section */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-background/50 border-b border-border text-[11px] text-muted-foreground">
                <div>
                  <span className="font-semibold text-foreground">Foydalanuvchi: </span>
                  <span className="font-mono">{userProfile?.email || 'Noma\'lum'}</span>
                </div>
                <div>
                  <span className="font-semibold text-foreground">Rol: </span>
                  <span className="font-mono capitalize">{userProfile?.role || 'Noma\'lum'}</span>
                </div>
                <div>
                  <span className="font-semibold text-foreground">Filial ID: </span>
                  <span className="font-mono select-all text-[9px]">{userProfile?.branchId || 'null'}</span>
                </div>
                <div>
                  <span className="font-semibold text-foreground">Smena Yuklash: </span>
                  <span className="font-mono text-primary font-bold">{shiftLoading ? 'Yuklanmoqda...' : 'Tayyor'}</span>
                </div>
                <div className="col-span-2 border-t border-border/50 pt-1.5 flex justify-between items-center">
                  <span>Smena holati: <strong className="text-foreground">{activeShift ? `Ochiq (ID: ${activeShift.id.slice(0,6)}...)` : 'Yopiq'}</strong></span>
                  {shiftError && <span className="text-red-500 font-semibold">{shiftError}</span>}
                </div>
              </div>

              {/* Log List */}
              <div className="p-3 overflow-y-auto space-y-1.5 bg-black/90 font-mono text-[10px] h-[220px]">
                {logs.length === 0 ? (
                  <p className="text-muted-foreground italic text-center py-8">Loglar hali mavjud emas...</p>
                ) : (
                  logs.map((log, i) => (
                    <div
                      key={i}
                      className={`py-0.5 leading-relaxed break-all ${
                        log.type === 'error' ? 'text-red-400 border-l-2 border-red-500 pl-1.5' :
                        log.type === 'warn' ? 'text-yellow-400 border-l-2 border-yellow-500 pl-1.5' : 'text-green-300'
                      }`}
                    >
                      <span className="text-muted-foreground text-[8px] mr-1">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                      {log.message}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

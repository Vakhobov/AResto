import React, { createContext, useContext, useEffect, useState } from 'react';
import { Shift, subscribeToActiveShift } from '@/services/shiftService';

interface ShiftContextValue {
  /** The currently open shift for this branch, or null if closed/loading. */
  activeShift: Shift | null;
  /** True while the first snapshot hasn't resolved yet. */
  shiftLoading: boolean;
  isOpen: boolean;
  /** Any error that occurred during shift loading */
  shiftError: string | null;
  /** Manually updates the active shift in the UI instantly */
  refreshActiveShift: (shift: Shift | null) => void;
}

const ShiftContext = createContext<ShiftContextValue | null>(null);

interface ShiftProviderProps {
  children: React.ReactNode;
  /**
   * The branch to subscribe for.
   * Pass null for SuperAdmin (shows any open shift).
   */
  branchId: string | null;
}

export const ShiftProvider: React.FC<ShiftProviderProps> = ({ children, branchId }) => {
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [shiftError, setShiftError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[ShiftProvider] effect started. branchId=', branchId);
    setShiftLoading(true);
    setShiftError(null);
    const unsub = subscribeToActiveShift(
      branchId,
      shift => {
        console.log('[ShiftProvider] callback received shift:', shift);
        setActiveShift(shift);
        setShiftLoading(false);
      },
      err => {
        console.error('[ShiftProvider] Shift subscription error:', err);
        setShiftError(err instanceof Error ? err.message : String(err));
        setShiftLoading(false);
      },
    );
    return unsub;
  }, [branchId]);

  const refreshActiveShift = (shift: Shift | null) => {
    console.log('[ShiftProvider] Manually refreshing activeShift to:', shift);
    setActiveShift(shift);
  };

  return (
    <ShiftContext.Provider
      value={{
        activeShift,
        shiftLoading,
        isOpen: activeShift?.status === 'open',
        shiftError,
        refreshActiveShift,
      }}
    >
      {children}
    </ShiftContext.Provider>
  );
};

export const useShift = (): ShiftContextValue => {
  const ctx = useContext(ShiftContext);
  if (!ctx) throw new Error('useShift must be used inside <ShiftProvider>');
  return ctx;
};

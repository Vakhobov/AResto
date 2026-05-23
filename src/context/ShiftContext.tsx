import React, { createContext, useContext, useEffect, useState } from 'react';
import { Shift, subscribeToActiveShift } from '@/services/shiftService';

interface ShiftContextValue {
  /** The currently open shift for this branch, or null if closed/loading. */
  activeShift: Shift | null;
  /** True while the first snapshot hasn't resolved yet. */
  shiftLoading: boolean;
  /** Convenience: true when there is an open shift. */
  isOpen: boolean;
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

  useEffect(() => {
    setShiftLoading(true);
    const unsub = subscribeToActiveShift(
      branchId,
      shift => {
        setActiveShift(shift);
        setShiftLoading(false);
      },
      err => {
        console.error('Shift subscription error:', err);
        setShiftLoading(false);
      },
    );
    return unsub;
  }, [branchId]);

  return (
    <ShiftContext.Provider
      value={{ activeShift, shiftLoading, isOpen: activeShift?.status === 'open' }}
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

import React, { createContext, useContext, useState, useCallback } from 'react';
import { DeviceMode, getDeviceMode, setDeviceMode, clearDeviceMode } from '@/lib/deviceMode';

interface DeviceModeContextValue {
  mode: DeviceMode | null;
  isCustomer: boolean;
  isStaff: boolean;
  setMode: (mode: DeviceMode) => void;
  resetMode: () => void;
}

const DeviceModeContext = createContext<DeviceModeContextValue | null>(null);

export const DeviceModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<DeviceMode | null>(() => getDeviceMode());

  const setMode = useCallback((m: DeviceMode) => {
    setDeviceMode(m);
    setModeState(m);
  }, []);

  const resetMode = useCallback(() => {
    clearDeviceMode();
    setModeState(null);
  }, []);

  return (
    <DeviceModeContext.Provider
      value={{
        mode,
        isCustomer: mode === 'customer',
        isStaff: mode === 'staff',
        setMode,
        resetMode,
      }}
    >
      {children}
    </DeviceModeContext.Provider>
  );
};

export const useDeviceMode = (): DeviceModeContextValue => {
  const ctx = useContext(DeviceModeContext);
  if (!ctx) throw new Error('useDeviceMode must be used inside <DeviceModeProvider>');
  return ctx;
};

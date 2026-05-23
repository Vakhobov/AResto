import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useDeviceMode } from '@/context/DeviceModeContext';
import { isStaffOnlyRoute } from '@/lib/deviceMode';

/**
 * DeviceModeRoute
 * ───────────────
 * Enforces device-level route restrictions.
 *
 * Customer tablets (mode === 'customer'):
 *   - May only visit /  and  /track/*
 *   - Any staff route → immediate redirect to /
 *
 * Staff devices (mode === 'staff') and unset devices:
 *   - No restrictions at this layer (auth ProtectedRoute handles role checks)
 *
 * No mode set yet:
 *   - Redirect to /setup so the device can be configured.
 *   - Exception: /setup itself is always allowed.
 */
const DeviceModeRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { mode } = useDeviceMode();
  const location = useLocation();

  // Always allow the setup page itself
  if (location.pathname === '/setup') {
    return <>{children}</>;
  }

  // No mode configured → must go through setup first
  if (mode === null) {
    return <Navigate to="/setup" replace />;
  }

  // Customer tablet: block all staff-only routes
  if (mode === 'customer' && isStaffOnlyRoute(location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default DeviceModeRoute;

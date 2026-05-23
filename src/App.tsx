import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { enableOfflinePersistence, auth } from '@/lib/firebase';
import { validateEnvironment, logValidationResult } from '@/lib/envValidation';
import { getUserProfile } from '@/services/userProfileService';
import { syncOfflineOrders } from '@/services/orderService';
import Index from './pages/Index';
import Admin from './pages/Admin';
import Kitchen from './pages/Kitchen';
import Login from './pages/Login';
import Setup from './pages/Setup';
import SuperAdmin from './pages/SuperAdmin';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

// Initialize offline persistence on app startup
enableOfflinePersistence().catch(console.error);

// Validate environment on startup
const envValidation = validateEnvironment();
logValidationResult(envValidation);

if (!envValidation.isValid) {
  throw new Error(`Environment validation failed: ${envValidation.errors.join(', ')}`);
}

const App = () => {
  useEffect(() => {
    // Monitor online/offline status
    const handleOnline = () => {
      console.log('🌐 Back online - attempting to sync offline orders');

      // Try to sync queued orders for current user branch
      try {
        const current = auth.currentUser;
        if (current) {
          getUserProfile(current.uid).then(profile => {
            const branchId = profile?.branchId;
            if (branchId) {
              syncOfflineOrders(branchId).catch(err => console.error('Failed to sync offline orders:', err));
            }
          }).catch(err => console.error('Failed to load user profile for sync:', err));
        }
      } catch (err) {
        console.error('Error while attempting offline sync:', err);
      }
    };

    const handleOffline = () => {
      console.log('📡 Network offline - switching to offline mode');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<Setup />} />

            {/* Menu role — customer ordering */}
            <Route
              path="/"
              element={
                <ProtectedRoute allowedRoles={['menu']}>
                  <Index />
                </ProtectedRoute>
              }
            />

            {/* Kitchen role — order dashboard */}
            <Route
              path="/kitchen"
              element={
                <ProtectedRoute allowedRoles={['kitchen']}>
                  <Kitchen />
                </ProtectedRoute>
              }
            />

            {/* Kitchen role — branch menu management */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['kitchen']}>
                  <Admin />
                </ProtectedRoute>
              }
            />

            {/* SuperAdmin only */}
            <Route
              path="/superadmin"
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <SuperAdmin />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;

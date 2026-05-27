import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase configuration is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

const normalizedSupabaseUrl = String(supabaseUrl).replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

// Create a singleton instance to prevent HMR deadlocks with GoTrueClient navigator.locks
const globalForSupabase = globalThis as unknown as {
  supabaseClient: SupabaseClient | undefined;
};

if (!globalForSupabase.supabaseClient) {
  globalForSupabase.supabaseClient = createClient(normalizedSupabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Custom lock implementation to bypass navigator.locks which causes deadlocks in dev.
      // Dynamically resolves the callback parameter to support different library signatures.
      lock: async (name, p2, p3) => {
        const fn = typeof p3 === 'function' ? p3 : (typeof p2 === 'function' ? p2 : null);
        if (fn) {
          console.log(`[Supabase Lock Bypassed] Successfully executed callback for lock: ${name}`);
          return await fn();
        }
        console.warn(`[Supabase Lock] No callback function found for lock: ${name}`);
      },
    },
  });
}

export const supabase = globalForSupabase.supabaseClient;

export const getSupabaseAccessToken = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
};

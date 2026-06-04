import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Fetches the payment mode for a specific branch.
 * Defaults to 'prepaid' if not set or branch not found.
 */
export const getBranchPaymentMode = async (
  branchId: string,
): Promise<'prepaid' | 'postpaid'> => {
  if (!branchId) return 'prepaid';
  
  const { data, error } = await supabase
    .from('branches')
    .select('payment_mode')
    .eq('id', branchId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching branch payment mode:', error);
    return 'prepaid';
  }

  return (data?.payment_mode as 'prepaid' | 'postpaid') || 'prepaid';
};

/**
 * Subscribes to changes in a branch's payment mode.
 */
export const subscribeToBranchPaymentMode = (
  branchId: string,
  callback: (paymentMode: 'prepaid' | 'postpaid') => void,
): (() => void) => {
  // Get initial value
  getBranchPaymentMode(branchId).then(callback);

  const channel: RealtimeChannel = supabase
    .channel(`branch_payment_mode:${branchId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'branches',
        filter: `id=eq.${branchId}`,
      },
      (payload) => {
        const mode = payload.new?.payment_mode as 'prepaid' | 'postpaid';
        callback(mode || 'prepaid');
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

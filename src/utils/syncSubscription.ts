import { supabase } from "@/integrations/supabase/client";

export const syncStripeSubscription = async () => {
  try {
    console.log('🔄 Requesting subscription sync...');
    
    const { data, error } = await supabase.functions.invoke('sync-stripe-subscription', {
      method: 'POST'
    });

    if (error) {
      console.error('❌ Sync error:', error);
      throw new Error(error.message || 'Failed to sync subscription');
    }

    if (!data.success) {
      throw new Error(data.error || 'Sync failed');
    }

    console.log('✅ Subscription synced:', data.subscription);
    return data.subscription;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to sync subscription:', errorMessage);
    throw error;
  }
};

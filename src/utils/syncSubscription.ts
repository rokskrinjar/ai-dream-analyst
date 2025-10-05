import { supabase } from "@/integrations/supabase/client";

export const syncStripeSubscription = async () => {
  try {
    console.log('🔄 Fixing subscription...');
    
    const { data, error } = await supabase.functions.invoke('fix-user-subscription');

    if (error) {
      console.error('❌ Fix error:', error);
      throw new Error(error.message || 'Failed to fix subscription');
    }

    if (!data.success) {
      throw new Error(data.error || 'Fix failed');
    }

    console.log('✅ Subscription fixed:', data.subscription);
    return data.subscription;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to fix subscription:', errorMessage);
    throw error;
  }
};

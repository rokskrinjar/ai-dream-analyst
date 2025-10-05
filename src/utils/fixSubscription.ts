import { supabase } from "@/integrations/supabase/client";

export const fixUserSubscription = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('fix-user-subscription');
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to fix subscription:', error);
    throw error;
  }
};

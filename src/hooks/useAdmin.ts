import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // Query user_roles table directly instead of using RPC function
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();
        
        if (error) {
          console.log('User is not admin or error checking admin status:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data && data.role === 'admin');
          console.log('Admin status check result:', data && data.role === 'admin');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  return { isAdmin, loading };
};

export const useAdminActions = () => {
  const logAdminAction = async (action: string, targetUserId?: string, details?: any) => {
    try {
      await supabase.from('admin_audit_log').insert({
        action,
        target_user_id: targetUserId,
        details,
        admin_user_id: (await supabase.auth.getUser()).data.user?.id
      });
    } catch (error) {
      console.error('Error logging admin action:', error);
    }
  };

  const updateUserCredits = async (userId: string, credits: number) => {
    try {
      const { error } = await supabase
        .from('user_credits')
        .upsert({
          user_id: userId,
          credits_remaining: credits,
          updated_at: new Date().toISOString()
        });

      if (!error) {
        await logAdminAction('UPDATE_CREDITS', userId, { credits });
      }

      return { error };
    } catch (error) {
      console.error('Error updating user credits:', error);
      return { error };
    }
  };

  const makeUserAdmin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'admin'
        });

      if (!error) {
        await logAdminAction('GRANT_ADMIN', userId);
      }

      return { error };
    } catch (error) {
      console.error('Error making user admin:', error);
      return { error };
    }
  };

  return {
    logAdminAction,
    updateUserCredits,
    makeUserAdmin
  };
};
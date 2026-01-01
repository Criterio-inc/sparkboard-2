import { useAuth } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';
import { useCallback } from 'react';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Hook for invoking Supabase edge functions and queries with Clerk authentication
 * This ensures all edge function calls and database queries include the Clerk JWT token
 */
export const useAuthenticatedFunctions = () => {
  const { getToken } = useAuth();

  const invokeWithAuth = useCallback(async <T = any>(
    functionName: string,
    body: Record<string, any>
  ): Promise<{ data: T | null; error: Error | null }> => {
    try {
      // Get Clerk session token
      const token = await getToken();
      
      if (!token) {
        return {
          data: null,
          error: new Error('Not authenticated - please log in')
        };
      }

      // Invoke edge function with Authorization header
      const { data, error } = await supabase.functions.invoke(functionName, {
        body,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error')
      };
    }
  }, [getToken]);

  /**
   * Get an authenticated Supabase client that includes the Clerk JWT token
   * Use this for direct database queries that need to pass RLS policies
   */
  const getAuthenticatedClient = useCallback(async () => {
    const token = await getToken();
    
    if (!token) {
      throw new Error('Not authenticated - please log in');
    }

    // Create a new Supabase client with the Clerk JWT in the Authorization header
    return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }, [getToken]);

  return { invokeWithAuth, getAuthenticatedClient };
};

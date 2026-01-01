import { useAuth } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

/**
 * Hook for invoking Supabase edge functions with Clerk authentication
 * This ensures all edge function calls include the Clerk JWT token
 * 
 * NOTE: Direct Supabase REST API queries with Clerk JWT do NOT work because
 * Supabase PostgREST cannot verify Clerk JWT signatures (different keys).
 * All authenticated database operations MUST go through edge functions.
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

  return { invokeWithAuth };
};

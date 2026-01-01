import { useUser, useAuth } from '@clerk/clerk-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  subscription_tier: 'free' | 'pro_monthly' | 'pro_yearly';
  subscription_status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_current_period_end: string | null;
  plan: string | null;
  plan_source: string | null;
}

export const useProfile = () => {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { getToken } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasCheckedSubscription = useRef(false);

  // Helper to get authenticated Supabase client
  const getAuthenticatedClient = useCallback(async () => {
    const token = await getToken();
    if (!token) return null;
    
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

  useEffect(() => {
    if (!isUserLoaded) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const syncProfile = async () => {
      try {
        const authClient = await getAuthenticatedClient();
        if (!authClient) {
          setLoading(false);
          return;
        }

        // Försök hämta befintlig profil
        const { data: existingProfile, error: fetchError } = await authClient
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        if (!existingProfile) {
          // Skapa ny profil
          const userEmail = user.primaryEmailAddress?.emailAddress || '';
          const isCuragoEmail = userEmail.toLowerCase().endsWith('@curago.se');
          
          const newProfile = {
            id: user.id,
            email: userEmail,
            first_name: user.firstName,
            last_name: user.lastName,
            image_url: user.imageUrl,
            subscription_tier: 'free',
            subscription_status: 'active',
            plan: isCuragoEmail ? 'curago' : 'free',
            plan_source: isCuragoEmail ? 'curago_domain' : null,
          };

          const { data, error: insertError } = await supabase
            .from('profiles')
            .insert(newProfile)
            .select()
            .single();

          if (insertError) throw insertError;
          setProfile(data as UserProfile);
          console.log('✅ Profil skapad:', data);
        } else {
          setProfile(existingProfile as UserProfile);
          console.log('✅ Profil laddad:', existingProfile);
        }

        setLoading(false);
      } catch (err) {
        console.error('❌ Profile sync error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    syncProfile();
  }, [user, isUserLoaded, getAuthenticatedClient]);

  // Auto-check subscription status once after profile loads
  useEffect(() => {
    if (!user?.id || !user?.primaryEmailAddress?.emailAddress || hasCheckedSubscription.current) {
      return;
    }
    
    if (!profile || loading) {
      return; // Wait for profile to load first
    }

    hasCheckedSubscription.current = true;
    
    const checkSubscription = async () => {
      try {
        console.log('🔄 Auto-checking subscription status...');
        const token = await getToken();
        const { data, error } = await supabase.functions.invoke('check-subscription', {
          body: { 
            userEmail: user.primaryEmailAddress!.emailAddress,
            userId: user.id
          },
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (error) {
          console.error('❌ Auto subscription check error:', error);
        } else {
          console.log('✅ Auto subscription check completed:', data);
        }
      } catch (err) {
        console.error('❌ Auto subscription check failed:', err);
      }
    };

    checkSubscription();
  }, [user, profile, loading]);

  // Listen to real-time updates on profile
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          console.log('✅ Profile updated (realtime):', payload.new);
          setProfile(payload.new as UserProfile);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return { 
    profile, 
    loading, 
    error,
    user,
    isSignedIn: !!user 
  };
};

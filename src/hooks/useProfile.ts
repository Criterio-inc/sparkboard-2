import { useUser, useAuth } from '@clerk/clerk-react';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

  useEffect(() => {
    if (!isUserLoaded) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const syncProfile = async () => {
      try {
        // Use check-subscription edge function to get/create profile
        // This edge function verifies Clerk JWT and uses service role to access DB
        const token = await getToken();
        
        const { data, error: fnError } = await supabase.functions.invoke('check-subscription', {
          body: { 
            userEmail: user.primaryEmailAddress?.emailAddress || '',
            userId: user.id
          },
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (fnError) {
          console.error('❌ Profile sync via check-subscription error:', fnError);
          // Fallback: try to create profile via insert (will work due to service role in edge function)
          throw fnError;
        }

        // The check-subscription function returns the profile data
        if (data?.profile) {
          setProfile(data.profile as UserProfile);
          console.log('✅ Profil laddad via check-subscription:', data.profile);
        } else {
          console.log('⚠️ No profile returned, creating fallback...');
          // Create basic profile object from Clerk user data
          const basicProfile: UserProfile = {
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress || '',
            first_name: user.firstName,
            last_name: user.lastName,
            image_url: user.imageUrl,
            subscription_tier: 'free',
            subscription_status: 'active',
            stripe_customer_id: null,
            stripe_subscription_id: null,
            subscription_current_period_end: null,
            plan: data?.plan || 'free',
            plan_source: data?.planSource || null,
          };
          setProfile(basicProfile);
        }

        setLoading(false);
      } catch (err) {
        console.error('❌ Profile sync error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    syncProfile();
  }, [user, isUserLoaded, getToken]);

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

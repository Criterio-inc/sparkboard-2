import { useUser } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
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
}

export const useProfile = () => {
  const { user, isLoaded: isUserLoaded } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isUserLoaded) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const syncProfile = async () => {
      try {
        // Försök hämta befintlig profil
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        if (!existingProfile) {
          // Skapa ny profil
          const newProfile = {
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress || '',
            first_name: user.firstName,
            last_name: user.lastName,
            image_url: user.imageUrl,
            subscription_tier: 'free',
            subscription_status: 'active',
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
  }, [user, isUserLoaded]);

  return { 
    profile, 
    loading, 
    error,
    user,
    isSignedIn: !!user 
  };
};

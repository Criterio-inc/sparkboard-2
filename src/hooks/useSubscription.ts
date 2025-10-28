import { useProfile } from './useProfile';

export const useSubscription = () => {
  const { profile, loading } = useProfile();
  
  const isCuragoUser = profile?.plan === 'curago';
  const isPro = profile?.plan === 'pro' || isCuragoUser;
  const isFree = profile?.plan === 'free';
  
  const canCreateUnlimitedWorkshops = isPro;
  
  return {
    profile,
    loading,
    plan: profile?.plan || 'free',
    planSource: profile?.plan_source,
    isPro,
    isFree,
    isCuragoUser,
    canCreateUnlimitedWorkshops,
  };
};

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useSubscription } from './useSubscription';
import { supabase } from '@/integrations/supabase/client';

export const useWorkshopLimit = () => {
  const { user } = useUser();
  const { isPro, isCuragoUser } = useSubscription();
  const [activeWorkshops, setActiveWorkshops] = useState(0);
  const [loading, setLoading] = useState(true);

  const canCreateMore = isPro || isCuragoUser || activeWorkshops < 1;
  const limit = isPro || isCuragoUser ? Infinity : 1;

  useEffect(() => {
    const fetchActiveWorkshops = async () => {
      if (!user?.id) return;

      try {
        const { count, error } = await supabase
          .from('workshops')
          .select('*', { count: 'exact', head: true })
          .eq('facilitator_id', user.id)
          .eq('status', 'active');

        if (error) throw error;
        setActiveWorkshops(count || 0);
      } catch (error) {
        console.error('Error fetching workshops:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveWorkshops();
  }, [user?.id]);

  return {
    activeWorkshops,
    limit,
    canCreateMore,
    loading,
    remainingWorkshops: isPro || isCuragoUser ? Infinity : Math.max(0, limit - activeWorkshops),
  };
};
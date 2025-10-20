import { useUser } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentSession } from '@/utils/facilitatorStorage';

export const useMigrateWorkshops = () => {
  const { user, isLoaded } = useUser();
  const [migrationStatus, setMigrationStatus] = useState<{
    isChecking: boolean;
    isComplete: boolean;
    migratedCount: number;
    error: string | null;
  }>({
    isChecking: true,
    isComplete: false,
    migratedCount: 0,
    error: null,
  });

  useEffect(() => {
    if (!isLoaded || !user) {
      setMigrationStatus(prev => ({ ...prev, isChecking: false }));
      return;
    }

    // Kolla om migration redan är gjord för denna användare
    const migrationKey = `migration_complete_${user.id}`;
    const alreadyMigrated = localStorage.getItem(migrationKey);

    if (alreadyMigrated === 'true') {
      console.log('✅ Migration redan genomförd för denna användare');
      setMigrationStatus({
        isChecking: false,
        isComplete: true,
        migratedCount: 0,
        error: null,
      });
      return;
    }

    const migrateOrphanedWorkshops = async () => {
      console.group('🔄 Workshop Migration');
      console.log('User ID:', user.id);
      console.log('User Email:', user.primaryEmailAddress?.emailAddress);

      try {
        let totalMigrated = 0;

        // Steg 1: Hitta workshops utan facilitator_id
        const { data: orphanedWorkshops, error: fetchError } = await supabase
          .from('workshops')
          .select('id, name, code, created_at')
          .is('facilitator_id', null);

        if (fetchError) {
          throw fetchError;
        }

        if (orphanedWorkshops && orphanedWorkshops.length > 0) {
          console.log(`📦 Hittade ${orphanedWorkshops.length} workshop(s) utan ägare:`);
          orphanedWorkshops.forEach(ws => {
            console.log(`  - ${ws.name} (${ws.code})`);
          });

          const { error: updateError } = await supabase
            .from('workshops')
            .update({ facilitator_id: user.id })
            .is('facilitator_id', null);

          if (updateError) {
            throw updateError;
          }

          totalMigrated += orphanedWorkshops.length;
          console.log(`✅ Migrerade ${orphanedWorkshops.length} orphaned workshop(s)`);
        }

        // Steg 2: Migrera workshops från legacy facilitator (denna browser)
        const legacySession = await getCurrentSession();
        if (legacySession?.facilitatorId) {
          console.log(`🔍 Letar efter workshops från legacy facilitator: ${legacySession.facilitatorId}`);
          
          const { data: legacyWorkshops, error: legacyFetchError } = await supabase
            .from('workshops')
            .select('id, name, code')
            .eq('facilitator_id', legacySession.facilitatorId);

          if (legacyFetchError) {
            throw legacyFetchError;
          }

          if (legacyWorkshops && legacyWorkshops.length > 0) {
            console.log(`📦 Hittade ${legacyWorkshops.length} legacy workshop(s):`);
            legacyWorkshops.forEach(ws => {
              console.log(`  - ${ws.name} (${ws.code})`);
            });

            const { error: legacyUpdateError } = await supabase
              .from('workshops')
              .update({ facilitator_id: user.id })
              .eq('facilitator_id', legacySession.facilitatorId);

            if (legacyUpdateError) {
              throw legacyUpdateError;
            }

            totalMigrated += legacyWorkshops.length;
            console.log(`✅ Migrerade ${legacyWorkshops.length} legacy workshop(s)`);
          }
        }

        console.log(`✅ Total migration: ${totalMigrated} workshop(s) till användare ${user.id}`);
        console.groupEnd();

        setMigrationStatus({
          isChecking: false,
          isComplete: true,
          migratedCount: totalMigrated,
          error: null,
        });

        // Markera som klar
        localStorage.setItem(migrationKey, 'true');

        // Visa bekräftelse till användaren
        if (totalMigrated > 0) {
          setTimeout(() => {
            alert(
              `✅ Välkommen till Sparkboard!\n\n` +
              `${totalMigrated} befintlig(a) workshop(s) har automatiskt kopplats till ditt nya konto.\n\n` +
              `Du kan nu se dem i din dashboard.`
            );
          }, 1000);
        }

      } catch (error) {
        console.error('❌ Migration error:', error);
        console.groupEnd();
        
        setMigrationStatus({
          isChecking: false,
          isComplete: false,
          migratedCount: 0,
          error: error instanceof Error ? error.message : 'Migration failed',
        });
      }
    };

    migrateOrphanedWorkshops();
  }, [user, isLoaded]);

  return migrationStatus;
};

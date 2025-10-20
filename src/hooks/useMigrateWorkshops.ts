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
        // Hitta ALLA workshops som inte ägs av en Clerk-användare
        // (dvs. facilitator_id är NULL ELLER börjar inte med "user_")
        const { data: allWorkshops, error: fetchError } = await supabase
          .from('workshops')
          .select('id, name, code, facilitator_id, created_at');

        if (fetchError) {
          throw fetchError;
        }

        // Filtrera: behåll bara de som inte ägs av Clerk-användare
        const workshopsToMigrate = (allWorkshops || []).filter(ws => {
          return !ws.facilitator_id || !ws.facilitator_id.startsWith('user_');
        });

        if (workshopsToMigrate.length === 0) {
          console.log('✅ Inga workshops behöver migreras');
          setMigrationStatus({
            isChecking: false,
            isComplete: true,
            migratedCount: 0,
            error: null,
          });
          localStorage.setItem(migrationKey, 'true');
          console.groupEnd();
          return;
        }

        console.log(`📦 Hittade ${workshopsToMigrate.length} workshop(s) att migrera:`);
        workshopsToMigrate.forEach(ws => {
          console.log(`  - ${ws.name} (${ws.code}) | facilitator_id: ${ws.facilitator_id || 'NULL'}`);
        });

        // Uppdatera ALLA dessa workshops till att ägas av denna Clerk-användare
        const workshopIds = workshopsToMigrate.map(ws => ws.id);
        
        const { error: updateError } = await supabase
          .from('workshops')
          .update({ facilitator_id: user.id })
          .in('id', workshopIds);

        if (updateError) {
          throw updateError;
        }

        console.log(`✅ Framgångsrikt migrerade ${workshopsToMigrate.length} workshop(s) till användare ${user.id}`);
        console.groupEnd();

        setMigrationStatus({
          isChecking: false,
          isComplete: true,
          migratedCount: workshopsToMigrate.length,
          error: null,
        });

        localStorage.setItem(migrationKey, 'true');

        // Visa bekräftelse
        if (workshopsToMigrate.length > 0) {
          setTimeout(() => {
            alert(
              `✅ Välkommen till Sparkboard!\n\n` +
              `${workshopsToMigrate.length} befintlig(a) workshop(s) har automatiskt kopplats till ditt nya konto.\n\n` +
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

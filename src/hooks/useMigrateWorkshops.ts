import { useUser } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
        // Steg 1: Hitta workshops utan facilitator_id
        const { data: orphanedWorkshops, error: fetchError } = await supabase
          .from('workshops')
          .select('id, name, code, created_at')
          .is('facilitator_id', null);

        if (fetchError) {
          throw fetchError;
        }

        if (!orphanedWorkshops || orphanedWorkshops.length === 0) {
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

        console.log(`📦 Hittade ${orphanedWorkshops.length} workshop(s) utan ägare:`);
        orphanedWorkshops.forEach(ws => {
          console.log(`  - ${ws.name} (${ws.code})`);
        });

        // Steg 2: Koppla alla till denna användare
        const { error: updateError } = await supabase
          .from('workshops')
          .update({ facilitator_id: user.id })
          .is('facilitator_id', null);

        if (updateError) {
          throw updateError;
        }

        console.log(`✅ Framgångsrikt migrerade ${orphanedWorkshops.length} workshop(s) till användare ${user.id}`);
        console.groupEnd();

        setMigrationStatus({
          isChecking: false,
          isComplete: true,
          migratedCount: orphanedWorkshops.length,
          error: null,
        });

        // Markera som klar
        localStorage.setItem(migrationKey, 'true');

        // Visa bekräftelse till användaren
        if (orphanedWorkshops.length > 0) {
          setTimeout(() => {
            alert(
              `✅ Välkommen till Sparkboard!\n\n` +
              `${orphanedWorkshops.length} befintlig(a) workshop(s) har automatiskt kopplats till ditt nya konto.\n\n` +
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

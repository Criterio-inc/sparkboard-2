import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar, Users, MoreVertical, Edit, Trash2, Copy, QrCode } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { WorkshopQRDialog } from "@/components/WorkshopQRDialog";
import { Navigation } from "@/components/Navigation";
import { useProfile } from "@/hooks/useProfile";
import { useMigrateWorkshops } from "@/hooks/useMigrateWorkshops";

const WorkshopDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedWorkshopCode, setSelectedWorkshopCode] = useState<string>("");
  
  const { profile, loading: profileLoading, user } = useProfile();
  const { isChecking, isComplete, migratedCount, error } = useMigrateWorkshops();

  useEffect(() => {
    if (user?.id) {
      loadWorkshops();
    }
  }, [user?.id, isComplete]);

  const loadWorkshops = async () => {
    if (!user?.id) return;
    
    try {
      const { data: ws, error } = await supabase
        .from('workshops')
        .select('*')
        .eq('facilitator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Hämta boards separat och räkna per workshop
      const workshopIds = ws?.map(w => w.id) || [];
      let countsByWorkshop: Record<string, number> = {};
      
      if (workshopIds.length > 0) {
        const { data: allBoards } = await supabase
          .from('boards')
          .select('id, workshop_id')
          .in('workshop_id', workshopIds);
        
        countsByWorkshop = (allBoards || []).reduce((acc, b) => {
          acc[b.workshop_id] = (acc[b.workshop_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }

      const workshopsWithCounts = (ws || []).map(workshop => ({
        ...workshop,
        boardCount: countsByWorkshop[workshop.id] || 0
      }));

      setWorkshops(workshopsWithCounts);
    } catch (error) {
      console.error('Error loading workshops:', error);
      toast({
        title: "Kunde inte ladda workshops",
        description: "Försök igen senare",
        variant: "destructive",
      });
    }
  };


  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('workshops')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Workshop raderad",
        description: "Workshopen har tagits bort",
      });

      loadWorkshops();
    } catch (error) {
      console.error('Error deleting workshop:', error);
      toast({
        title: "Kunde inte radera workshop",
        description: "Försök igen senare",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (id: string) => {
    navigate(`/create-workshop/${id}`);
  };

  const handleShowQR = (code: string) => {
    setSelectedWorkshopCode(code);
    setQrDialogOpen(true);
  };

  const handleDuplicate = async (workshop: any) => {
    try {
      const { data: newWorkshop, error: workshopError } = await supabase
        .from('workshops')
        .insert({
          name: `${workshop.name || 'Workshop'} (kopia)`,
          facilitator_id: user?.id,
          code: Math.floor(100000 + Math.random() * 900000).toString(),
          status: 'draft',
        })
        .select()
        .single();

      if (workshopError) throw workshopError;

      const { data: boards } = await supabase
        .from('boards')
        .select('*')
        .eq('workshop_id', workshop.id);

      if (boards) {
        for (const board of boards) {
          const { data: newBoard, error: boardError } = await supabase
            .from('boards')
            .insert({
              workshop_id: newWorkshop.id,
              title: board.title,
              color_index: board.color_index,
              time_limit: board.time_limit,
              order_index: board.order_index,
            })
            .select()
            .single();

          if (boardError) throw boardError;

          const { data: questions } = await supabase
            .from('questions')
            .select('*')
            .eq('board_id', board.id);

          if (questions) {
            const questionsToInsert = questions.map(q => ({
              board_id: newBoard.id,
              title: q.title,
              order_index: q.order_index,
            }));

            const { error: questionsError } = await supabase
              .from('questions')
              .insert(questionsToInsert);

            if (questionsError) throw questionsError;
          }
        }
      }

      toast({
        title: "Workshop duplicerad!",
        description: "En kopia av workshopen har skapats",
      });

      loadWorkshops();
    } catch (error) {
      console.error('Error duplicating workshop:', error);
      toast({
        title: "Kunde inte duplicera workshop",
        description: "Försök igen senare",
        variant: "destructive",
      });
    }
  };

  // Visa loading under migration
  if (isChecking || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F3DADF] to-white">
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#19305C] mx-auto mb-6"></div>
            <h2 className="text-2xl font-semibold text-[#03122F] mb-2">
              {isChecking ? '🔄 Kontrollerar dina workshops...' : 'Laddar...'}
            </h2>
            <p className="text-gray-600">
              {isChecking ? 'Detta tar bara några sekunder' : 'Vänligen vänta'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Visa migration-fel om något gick fel
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F3DADF] to-white">
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="max-w-md bg-red-50 border-2 border-red-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">
              ⚠️ Migration Error
            </h2>
            <p className="text-red-700 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Försök igen
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Visa success-meddelande om workshops migrerades
  const showMigrationSuccess = isComplete && migratedCount > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F3DADF] to-white">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Migration success banner */}
        {showMigrationSuccess && (
          <div className="bg-green-50 border-l-4 border-green-500 p-6 mb-8 rounded-r-lg">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-semibold text-green-900 mb-1">
                  ✅ Dina workshops är nu kopplade till ditt konto!
                </h3>
                <p className="text-green-700 text-sm">
                  {migratedCount} workshop{migratedCount > 1 ? 's' : ''} har automatiskt kopplats till din nya inloggning.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#03122F]">
              {t('dashboard.title')}
            </h1>
            <p className="text-gray-600 mt-2">
              {workshops.length} {workshops.length === 1 ? 'workshop' : 'workshops'}
            </p>
          </div>
          
          <Link to="/create-workshop">
            <Button className="bg-gradient-to-r from-[#F1916D] to-[#AE7DAC] text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90">
              <Plus className="w-5 h-5 mr-2" />
              {t('dashboard.createNew')}
            </Button>
          </Link>
        </div>

        {/* Workshops Grid */}
        {workshops.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              {t('dashboard.noWorkshops')}
            </h2>
            <p className="text-gray-500 mb-6">
              {t('dashboard.comeBack')}
            </p>
            <Link to="/create-workshop">
              <Button className="bg-gradient-to-r from-[#F1916D] to-[#AE7DAC] text-white">
                <Plus className="w-4 h-4 mr-2" />
                {t('dashboard.createWorkshop')}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workshops.map((workshop) => (
              <Card key={workshop.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{workshop.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(workshop.date).toLocaleDateString('sv-SE')}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(workshop.id)}>
                          <Edit className="w-4 h-4 mr-2" />
                          {t('dashboard.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(workshop)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicera
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShowQR(workshop.code)}>
                          <QrCode className="w-4 h-4 mr-2" />
                          Visa QR
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(workshop.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t('dashboard.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant={workshop.status === 'active' ? 'default' : 'secondary'}>
                        {workshop.status === 'active' ? t('dashboard.status.active') : t('dashboard.status.draft')}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {workshop.code}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{workshop.boardCount} {t('dashboard.boards')}</span>
                      </div>
                    </div>

                    <Link to={`/facilitator/${workshop.id}`}>
                      <Button className="w-full mt-4" variant="outline">
                        {t('dashboard.openWorkshop')}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <WorkshopQRDialog
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
        code={selectedWorkshopCode}
      />
    </div>
  );
};

export default WorkshopDashboard;

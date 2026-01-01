import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar, Users, MoreVertical, Edit, Trash2, Copy, QrCode, Sparkles } from "lucide-react";
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
import { useSubscription } from "@/hooks/useSubscription";
import { useAuthenticatedFunctions } from "@/hooks/useAuthenticatedFunctions";

const WorkshopDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedWorkshopCode, setSelectedWorkshopCode] = useState<string>("");
  
  const { profile, loading: profileLoading, user } = useProfile();
  const { isChecking, isComplete, migratedCount, error } = useMigrateWorkshops();
  const { isFree, isPro, loading: subscriptionLoading } = useSubscription();
  const { invokeWithAuth } = useAuthenticatedFunctions();

  const dateLocale = language === 'sv' ? 'sv-SE' : 'en-US';

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
        title: t('dashboard.loadFailed'),
        description: t('account.tryAgainLater'),
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { data, error } = await invokeWithAuth('workshop-operations', {
        operation: 'delete-workshop',
        workshopId: id
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: t('dashboard.workshopDeleted'),
        description: t('dashboard.workshopDeletedDesc'),
      });

      loadWorkshops();
    } catch (error) {
      console.error('Error deleting workshop:', error);
      toast({
        title: t('dashboard.deleteFailed'),
        description: t('account.tryAgainLater'),
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
      const { data, error } = await invokeWithAuth('workshop-operations', {
        operation: 'duplicate-workshop',
        workshopId: workshop.id
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: t('dashboard.workshopDuplicated'),
        description: t('dashboard.workshopDuplicatedDesc'),
      });

      loadWorkshops();
    } catch (error) {
      console.error('Error duplicating workshop:', error);
      toast({
        title: t('dashboard.duplicateFailed'),
        description: t('account.tryAgainLater'),
        variant: "destructive",
      });
    }
  };

  if (isChecking || profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-6"></div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              {isChecking ? `🔄 ${t('dashboard.checking')}` : t('common.loading')}
            </h2>
            <p className="text-muted-foreground">
              {isChecking ? t('dashboard.takesSeconds') : t('dashboard.pleaseWait')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="max-w-md bg-destructive/10 border-2 border-destructive/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-destructive mb-2">
              ⚠️ {t('dashboard.migrationError')}
            </h2>
            <p className="text-destructive/80 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg hover:opacity-90"
            >
              {t('dashboard.tryAgain')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const showMigrationSuccess = isComplete && migratedCount > 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {showMigrationSuccess && (
          <div className="bg-green-50 dark:bg-green-950/30 border-l-4 border-green-500 p-6 mb-8 rounded-r-lg">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                  ✅ {t('dashboard.workshopsMigrated')}
                </h3>
                <p className="text-green-700 dark:text-green-300 text-sm">
                  {t('dashboard.workshopsMigratedDesc', { count: migratedCount.toString() })}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground">
              {t('dashboard.title')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {workshops.length} {workshops.length === 1 ? t('dashboard.workshop') : t('dashboard.workshops')}
            </p>
          </div>
          
          {isFree && workshops.length >= 1 ? (
            <Link to="/upgrade">
              <Button className="bg-gradient-to-r from-accent to-secondary text-accent-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90">
                <Sparkles className="w-5 h-5 mr-2" />
                {t('dashboard.upgradeForMore')}
              </Button>
            </Link>
          ) : (
            <Link to="/create-workshop">
              <Button className="bg-gradient-to-r from-accent to-secondary text-accent-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90">
                <Plus className="w-5 h-5 mr-2" />
                {t('dashboard.createNew')}
              </Button>
            </Link>
          )}
        </div>

        {isFree && workshops.length >= 1 && (
          <div className="bg-yellow-50 dark:bg-yellow-950/30 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
            <p className="text-yellow-800 dark:text-yellow-200">
              <strong>📊 Free-plan:</strong> {t('dashboard.freePlanWarning')}{' '}
              <Link to="/upgrade" className="underline ml-1 font-semibold hover:opacity-80">
                {t('dashboard.upgradeForMore')}
              </Link>{' '}
              {t('dashboard.forUnlimited')}
            </p>
          </div>
        )}

        {workshops.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-semibold text-muted-foreground mb-2">
              {t('dashboard.noWorkshops')}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t('dashboard.comeBack')}
            </p>
            <Link to="/create-workshop">
              <Button className="bg-gradient-to-r from-accent to-secondary text-accent-foreground">
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
                        {new Date(workshop.date).toLocaleDateString(dateLocale)}
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
                          {t('dashboard.duplicate')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShowQR(workshop.code)}>
                          <QrCode className="w-4 h-4 mr-2" />
                          {t('dashboard.showQR')}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(workshop.id)}
                          className="text-destructive"
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
                      <span className="text-sm text-muted-foreground">
                        {workshop.code}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
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

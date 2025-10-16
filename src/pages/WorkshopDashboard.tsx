import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar, Users, ArrowLeft, MoreVertical, Edit, Trash2, Copy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getCurrentFacilitator, clearSession, updateSessionTimestamp, getAllFacilitators, deleteFacilitator, syncLocalFacilitatorsToBackend } from "@/utils/facilitatorStorage";
import FacilitatorAuth from "@/components/FacilitatorAuth";
import { LogOut, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const WorkshopDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [showAuth, setShowAuth] = useState(false);
  const [facilitator, setFacilitator] = useState<any>(null);
  const [allFacilitators, setAllFacilitators] = useState(getAllFacilitators());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [facilitatorToDelete, setFacilitatorToDelete] = useState<string | null>(null);

  useEffect(() => {
    const initializeFacilitator = async () => {
      // One-time sync of local facilitators to backend
      await syncLocalFacilitatorsToBackend();
      
      const currentFacilitator = await getCurrentFacilitator();
      setFacilitator(currentFacilitator);
      if (currentFacilitator) {
        await updateSessionTimestamp();
      }
    };
    
    initializeFacilitator();
    loadWorkshops(); // Ladda alltid workshops
  }, []);

  const loadWorkshops = async () => {
    try {
      const currentFacilitator = await getCurrentFacilitator();
      
      if (!currentFacilitator) {
        setWorkshops([]);
        console.log("📦 Ingen inloggad facilitator - visar inga workshops");
        return;
      }

      // Hämta endast workshops för den inloggade facilitatorn
      const { data: workshopsData, error } = await supabase
        .from("workshops")
        .select("*")
        .eq("facilitator_id", currentFacilitator.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fel vid hämtning av workshops:", error);
        toast({
          title: "Fel",
          description: "Kunde inte hämta workshops",
          variant: "destructive",
        });
        return;
      }

      // Hämta boards separat för alla workshops
      if (workshopsData && workshopsData.length > 0) {
        const workshopIds = workshopsData.map(w => w.id);
        const { data: boardsData, error: boardsError } = await supabase
          .from('boards')
          .select('id, workshop_id')
          .in('workshop_id', workshopIds);

        if (boardsError) {
          console.error("Fel vid hämtning av boards:", boardsError);
        }

        // Bygg countMap
        const countMap = new Map<string, number>();
        (boardsData || []).forEach(board => {
          const current = countMap.get(board.workshop_id) || 0;
          countMap.set(board.workshop_id, current + 1);
        });

        // Sätt workshops med boards_count
        const workshopsWithCounts = workshopsData.map(workshop => ({
          ...workshop,
          boards_count: countMap.get(workshop.id) || 0,
        }));

        setWorkshops(workshopsWithCounts);
        console.log("📦 Workshops hämtade:", workshopsWithCounts.length);
      } else {
        setWorkshops([]);
        console.log("📦 Inga workshops att visa");
      }
    } catch (error) {
      console.error("Fel vid laddning av workshops:", error);
      toast({
        title: "Fel",
        description: "Oväntat fel vid laddning",
        variant: "destructive",
      });
    }
  };

  const handleAuthenticated = async () => {
    const currentFacilitator = await getCurrentFacilitator();
    if (currentFacilitator) {
      setFacilitator(currentFacilitator);
      setAllFacilitators(getAllFacilitators());
      loadWorkshops();
      setShowAuth(false);
    }
  };

  const handleLogout = async () => {
    await clearSession();
    setFacilitator(null);
    setWorkshops([]);
    toast({
      title: "Utloggad",
      description: "Du har loggats ut",
    });
    navigate("/");
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("workshops").delete().eq("id", id);
      if (error) throw error;

      loadWorkshops();
      toast({
        title: "Workshop borttagen",
        description: "Workshopen har tagits bort",
      });
    } catch (error) {
      console.error("Fel vid borttagning:", error);
      toast({
        title: "Fel",
        description: "Kunde inte ta bort workshop",
        variant: "destructive",
      });
    }
  };

  const handleDuplicate = async (id: string) => {
    toast({
      title: "Funktionen är inte tillgänglig än",
      description: "Duplicering kommer snart",
    });
  };

  const handleEdit = (id: string) => {
    navigate(`/create-workshop/${id}`);
  };

  const handleDeleteFacilitator = (facilitatorId: string) => {
    setFacilitatorToDelete(facilitatorId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (facilitatorToDelete) {
      const success = await deleteFacilitator(facilitatorToDelete);
      if (success) {
        setAllFacilitators(getAllFacilitators());
        const currentFacilitator = await getCurrentFacilitator();
        setFacilitator(currentFacilitator);
        toast({
          title: "Facilitator borttagen",
          description: "Kontot har raderats",
        });
      }
    }
    setDeleteDialogOpen(false);
    setFacilitatorToDelete(null);
  };


  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('nav.back')}
              </Button>
            </Link>

            <div className="flex items-center gap-4">
              {facilitator ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{facilitator.name}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    {t('nav.logout')}
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setShowAuth(true)}>
                  <User className="w-4 h-4 mr-2" />
                  {t('nav.login')}
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                {t('dashboard.title')}
              </h1>
              <p className="text-muted-foreground">
                {workshops.length} {workshops.length === 1 ? t('dashboard.workshop') : t('dashboard.workshops')}
              </p>
            </div>

            {facilitator ? (
              <Link to="/create-workshop">
                <Button variant="hero" size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  {t('dashboard.createNew')}
                </Button>
              </Link>
            ) : (
              <Button variant="hero" size="lg" onClick={() => setShowAuth(true)}>
                <Plus className="w-5 h-5 mr-2" />
                {t('dashboard.createNew')}
              </Button>
            )}
          </div>
        </div>

        {/* Workshop Grid */}
        {workshops.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('dashboard.noWorkshops')}</h3>
              <p className="text-muted-foreground mb-6">{t('dashboard.comeBack')}</p>
              {facilitator ? (
                <Link to="/create-workshop">
                  <Button variant="hero">
                    <Plus className="w-5 h-5 mr-2" />
                    {t('dashboard.createWorkshop')}
                  </Button>
                </Link>
              ) : (
                <Button variant="hero" onClick={() => setShowAuth(true)}>
                  <Plus className="w-5 h-5 mr-2" />
                  {t('dashboard.createWorkshop')}
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {workshops.map((workshop) => (
              <Card
                key={workshop.id}
                className="hover:shadow-[var(--shadow-glow)] transition-all duration-300 hover:scale-105 bg-gradient-to-br from-card to-muted/20"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl">{workshop.name}</CardTitle>
                        <Badge variant={(workshop as any).status === 'draft' ? 'outline' : 'default'}>
                          {(workshop as any).status === 'draft' ? t('dashboard.status.draft') : t('dashboard.status.active')}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        {workshop.code && (
                          <span className="font-mono text-lg font-semibold text-primary">{workshop.code}</span>
                        )}
                      </CardDescription>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(workshop.id)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Redigera
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(workshop.id)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicera
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(workshop.id)}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Ta bort
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(workshop.created_at).toLocaleDateString("sv-SE")}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{workshop.boards_count || 0} {t('dashboard.boards')}</span>
                    </div>

                    <Link to={`/facilitator/${workshop.id}`} className="w-full">
                      <Button className="w-full mt-4" variant="default">
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
      
      {showAuth && <FacilitatorAuth open={showAuth} onAuthenticated={handleAuthenticated} />}

      {/* Facilitator Management Section */}
      {facilitator && allFacilitators.length > 0 && (
        <div className="container mx-auto px-4 mt-8 border-t pt-8">
          <h2 className="text-2xl font-semibold mb-4">Facilitatorkonton</h2>
          <div className="grid gap-3 max-w-2xl">
            {allFacilitators.map((f) => (
              <Card key={f.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-lg">{f.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Skapad: {new Date(f.createdAt).toLocaleDateString('sv-SE')}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteFacilitator(f.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Radera
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Är du säker?</AlertDialogTitle>
            <AlertDialogDescription>
              Detta kommer permanent radera facilitatorkontot. Denna åtgärd kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Radera</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WorkshopDashboard;

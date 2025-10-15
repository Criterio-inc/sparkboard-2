import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar, Users, ArrowLeft, MoreVertical, Edit, Trash2, Copy } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getCurrentFacilitator, clearSession, updateSessionTimestamp } from "@/utils/facilitatorStorage";
import FacilitatorAuth from "@/components/FacilitatorAuth";
import { LogOut, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const WorkshopDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [showAuth, setShowAuth] = useState(false);
  const [facilitator, setFacilitator] = useState(getCurrentFacilitator());

  useEffect(() => {
    const currentFacilitator = getCurrentFacilitator();
    if (!currentFacilitator) {
      setShowAuth(true);
    } else {
      setFacilitator(currentFacilitator);
      loadWorkshops();
      updateSessionTimestamp();
    }
  }, []);

  const loadWorkshops = async () => {
    try {
      const { data, error } = await supabase
        .from('workshops')
        .select('*, boards(id)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Fel vid hämtning av workshops:", error);
        return;
      }

      setWorkshops(data || []);
      console.log("📦 Workshops hämtade:", data?.length || 0);
    } catch (error) {
      console.error("Fel vid laddning av workshops:", error);
    }
  };

  const handleAuthenticated = () => {
    const currentFacilitator = getCurrentFacilitator();
    if (currentFacilitator) {
      setFacilitator(currentFacilitator);
      loadWorkshops();
      setShowAuth(false);
    }
  };

  const handleLogout = () => {
    clearSession();
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
      const { error } = await supabase.from('workshops').delete().eq('id', id);
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

  if (showAuth) {
    return <FacilitatorAuth open={showAuth} onAuthenticated={handleAuthenticated} />;
  }

  if (!facilitator) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Tillbaka
              </Button>
            </Link>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{facilitator.name}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logga ut
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                Mina Workshops
              </h1>
              <p className="text-muted-foreground">
                {workshops.length} {workshops.length === 1 ? 'workshop' : 'workshops'}
              </p>
            </div>
            
            <Link to="/create-workshop">
              <Button variant="hero" size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Skapa Ny Workshop
              </Button>
            </Link>
          </div>
        </div>

        {/* Workshop Grid */}
        {workshops.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Inga workshops än</h3>
              <p className="text-muted-foreground mb-6">
                Kom igång genom att skapa din första workshop
              </p>
              <Link to="/create-workshop">
                <Button variant="hero">
                  <Plus className="w-5 h-5 mr-2" />
                  Skapa Workshop
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                        <Badge variant="default">Aktiv</Badge>
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        {workshop.code && (
                          <span className="font-mono text-lg font-semibold text-primary">
                            {workshop.code}
                          </span>
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
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDelete(workshop.id)}
                        >
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
                      <span>{new Date(workshop.created_at).toLocaleDateString('sv-SE')}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{workshop.boards?.length || 0} boards</span>
                    </div>
                    
                    <Link to={`/facilitator/${workshop.id}`} className="w-full">
                      <Button className="w-full mt-4" variant="default">
                        Öppna Workshop
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkshopDashboard;

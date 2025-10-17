import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trash2, User } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { getAllFacilitators, deleteFacilitator, getCurrentFacilitator, clearSession } from "@/utils/facilitatorStorage";
import { supabase } from "@/integrations/supabase/client";

interface Facilitator {
  id: string;
  name: string;
  createdAt: string;
}

const FacilitatorSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [facilitators, setFacilitators] = useState<Facilitator[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [facilitatorToDelete, setFacilitatorToDelete] = useState<Facilitator | null>(null);
  const [currentFacilitatorId, setCurrentFacilitatorId] = useState<string | null>(null);

  useEffect(() => {
    loadFacilitators();
    loadCurrentFacilitator();
  }, []);

  const loadFacilitators = async () => {
    try {
      // Get all facilitators from Supabase
      const { data, error } = await supabase
        .from("facilitators")
        .select("id, name, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading facilitators:", error);
        return;
      }

      const formattedFacilitators = (data || []).map((f) => ({
        id: f.id,
        name: f.name,
        createdAt: f.created_at,
      }));

      setFacilitators(formattedFacilitators);
    } catch (error) {
      console.error("Error loading facilitators:", error);
    }
  };

  const loadCurrentFacilitator = async () => {
    const current = await getCurrentFacilitator();
    if (current) {
      setCurrentFacilitatorId(current.id);
    } else {
      // If not logged in, redirect to dashboard
      navigate("/dashboard");
    }
  };

  const handleDeleteFacilitator = (facilitator: Facilitator) => {
    setFacilitatorToDelete(facilitator);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!facilitatorToDelete) return;

    const isCurrentUser = facilitatorToDelete.id === currentFacilitatorId;

    try {
      const success = await deleteFacilitator(facilitatorToDelete.id);

      if (success) {
        toast({
          title: "Facilitator raderad",
          description: `${facilitatorToDelete.name} har tagits bort`,
        });

        if (isCurrentUser) {
          // If deleting own account, clear session and redirect to home
          await clearSession();
          toast({
            title: "Ditt konto har raderats",
            description: "Du har loggats ut",
          });
          navigate("/");
        } else {
          // Reload facilitators list
          loadFacilitators();
        }
      } else {
        toast({
          title: "Fel",
          description: "Kunde inte radera facilitatorn",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting facilitator:", error);
      toast({
        title: "Fel",
        description: "Ett oväntat fel uppstod",
        variant: "destructive",
      });
    }

    setDeleteDialogOpen(false);
    setFacilitatorToDelete(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tillbaka till Dashboard
          </Button>

          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
            Facilitatorinställningar
          </h1>
          <p className="text-muted-foreground">
            Hantera dina facilitatorkonton
          </p>
        </div>

        {/* Facilitators List */}
        <div className="space-y-4">
          {facilitators.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                  <User className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Inga facilitatorer</h3>
                <p className="text-muted-foreground">Det finns inga facilitatorkonton ännu</p>
              </div>
            </Card>
          ) : (
            facilitators.map((facilitator) => (
              <Card key={facilitator.id} className="hover:shadow-[var(--shadow-card)] transition-shadow">
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">
                        {facilitator.name}
                        {facilitator.id === currentFacilitatorId && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            (Du)
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Skapad: {new Date(facilitator.createdAt).toLocaleDateString("sv-SE")}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteFacilitator(facilitator)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Radera
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Är du säker?</AlertDialogTitle>
            <AlertDialogDescription>
              {facilitatorToDelete?.id === currentFacilitatorId ? (
                <>
                  Du är på väg att radera ditt eget konto. Detta kommer permanent radera facilitatorkontot och alla tillhörande workshops. Du kommer att loggas ut.
                  <br /><br />
                  <strong>Denna åtgärd kan inte ångras.</strong>
                </>
              ) : (
                <>
                  Detta kommer permanent radera facilitatorkontot för <strong>{facilitatorToDelete?.name}</strong> och alla tillhörande workshops.
                  <br /><br />
                  <strong>Denna åtgärd kan inte ångras.</strong>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Radera
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FacilitatorSettings;

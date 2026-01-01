import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Sparkles, Plus, Save, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BoardCard } from "@/components/BoardCard";
import { WorkshopQRDialog } from "@/components/WorkshopQRDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProfile } from "@/hooks/useProfile";
import { useSubscription } from "@/hooks/useSubscription";
import { useWorkshopLimit } from "@/hooks/useWorkshopLimit";
import { UpgradeRequiredDialog } from "@/components/UpgradeRequiredDialog";
import { useAuthenticatedFunctions } from "@/hooks/useAuthenticatedFunctions";

interface Question {
  id: string;
  title: string;
}

interface Board {
  id: string;
  title: string;
  timeLimit: number;
  questions: Question[];
  colorIndex: number;
}

interface Workshop {
  title: string;
  description: string;
  boards: Board[];
  code?: string;
  status: "draft" | "active";
}

const CreateWorkshop = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { id } = useParams();
  const { user } = useProfile();
  const { isFree, isPro } = useSubscription();
  const { canCreateMore, activeWorkshops, limit } = useWorkshopLimit();
  const { invokeWithAuth } = useAuthenticatedFunctions();
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [workshopId, setWorkshopId] = useState<string | undefined>(id);
  const [hasResponses, setHasResponses] = useState(false);
  const [isLoadingResponses, setIsLoadingResponses] = useState(true);
  const [draggedBoardIndex, setDraggedBoardIndex] = useState<number | null>(null);

  const [workshop, setWorkshop] = useState<Workshop>({
    title: "",
    description: "",
    boards: [],
    status: "draft",
  });

  useEffect(() => {
    const loadWorkshop = async () => {
      if (!workshopId) {
        setIsLoadingResponses(false);
        return;
      }

      try {
        // Use edge function to load workshop (Clerk JWT verified there)
        const { data, error } = await invokeWithAuth('workshop-operations', {
          operation: 'get-workshop',
          workshopId: workshopId
        });

        if (error || data?.error || !data?.workshop) {
          console.error("Fel vid laddning av workshop:", error || data?.error);
          setIsLoadingResponses(false);
          return;
        }

        const workshopData = data.workshop;
        const boardsData = data.boards || [];

        const boardsWithQuestions = boardsData.map((board: any) => ({
          id: board.id,
          title: board.title,
          timeLimit: board.time_limit,
          colorIndex: board.color_index,
          questions: (board.questions || []).map((q: any) => ({
            id: q.id,
            title: q.title,
          })),
          orderIndex: board.order_index,
        }));

        setHasResponses(data.hasResponses || false);

        setWorkshop({
          title: workshopData.name,
          description: '',
          boards: boardsWithQuestions,
          code: workshopData.code,
          status: (workshopData.status === 'draft' ? 'draft' : 'active') as 'draft' | 'active',
        });

        if (workshopData.code) {
          setGeneratedCode(workshopData.code);
        }

        setIsLoadingResponses(false);
      } catch (error) {
        console.error("Fel vid laddning av workshop:", error);
        setIsLoadingResponses(false);
      }
    };

    loadWorkshop();
  }, [workshopId]);

  const addBoard = () => {
    const newBoard: Board = {
      id: `board-${Date.now()}`,
      title: "",
      timeLimit: 15,
      questions: [],
      colorIndex: workshop.boards.length,
    };

    setWorkshop({
      ...workshop,
      boards: [...workshop.boards, newBoard],
    });
  };

  const updateBoard = (boardId: string, updatedBoard: Board) => {
    setWorkshop({
      ...workshop,
      boards: workshop.boards.map((b) => (b.id === boardId ? updatedBoard : b)),
    });
  };

  const deleteBoard = (boardId: string) => {
    setWorkshop({
      ...workshop,
      boards: workshop.boards.filter((b) => b.id !== boardId),
    });
  };

  const handleDragStart = (index: number) => {
    setDraggedBoardIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedBoardIndex === null || draggedBoardIndex === index) return;

    const newBoards = [...workshop.boards];
    const draggedBoard = newBoards[draggedBoardIndex];
    newBoards.splice(draggedBoardIndex, 1);
    newBoards.splice(index, 0, draggedBoard);

    setWorkshop({ ...workshop, boards: newBoards });
    setDraggedBoardIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedBoardIndex(null);
  };

  const validateWorkshop = (): boolean => {
    if (!workshop.title.trim()) {
      toast({
        title: t('createWorkshop.titleMissing'),
        description: t('createWorkshop.titleMissingDesc'),
        variant: "destructive",
      });
      return false;
    }

    if (workshop.boards.length === 0) {
      toast({
        title: t('createWorkshop.noBoards'),
        description: t('createWorkshop.noBoardsDesc'),
        variant: "destructive",
      });
      return false;
    }

    for (const board of workshop.boards) {
      if (!board.title.trim()) {
        toast({
          title: t('createWorkshop.boardTitleMissing'),
          description: t('createWorkshop.boardTitleMissingDesc'),
          variant: "destructive",
        });
        return false;
      }

      if (board.questions.length === 0) {
        toast({
          title: t('createWorkshop.noQuestions'),
          description: t('createWorkshop.noQuestionsDesc', { title: board.title }),
          variant: "destructive",
        });
        return false;
      }

      for (const question of board.questions) {
        if (!question.title.trim()) {
          toast({
            title: t('createWorkshop.questionMissing'),
            description: t('createWorkshop.questionMissingDesc', { title: board.title }),
            variant: "destructive",
          });
          return false;
        }
      }
    }

    return true;
  };

  const handleSaveDraft = async () => {
    if (!validateWorkshop()) return;

    if (!user?.id) {
      toast({
        title: t('common.error'),
        description: t('createWorkshop.loginRequired'),
        variant: "destructive",
      });
      return;
    }

    // Check workshop limit before creating new draft
    if (!workshopId && !canCreateMore) {
      setShowUpgradeDialog(true);
      return;
    }

    console.log("=== SPARAR WORKSHOP SOM DRAFT (VIA EDGE FUNCTION) ===");
    
    try {
      const { data, error } = await invokeWithAuth('workshop-operations', {
        operation: 'save-draft',
        workshopId: workshopId,
        workshop: {
          title: workshop.title,
          description: workshop.description,
          boards: workshop.boards.map((board, index) => ({
            title: board.title,
            timeLimit: board.timeLimit,
            colorIndex: board.colorIndex || index,
            questions: board.questions.map(q => ({ title: q.title })),
          })),
          code: workshop.code,
        },
      });

      if (error) throw error;

      if (data?.workshop) {
        setWorkshopId(data.workshop.id);
        setGeneratedCode(data.workshop.code);
      }

      toast({
        title: t('createWorkshop.draftSaved'),
        description: t('createWorkshop.draftSavedDesc'),
      });

      navigate('/dashboard');
    } catch (error) {
      console.error("Fel vid sparning av draft:", error);
      toast({
        title: t('common.error'),
        description: t('createWorkshop.draftSaveFailed'),
        variant: "destructive",
      });
    }
  };

  const handleActivate = async () => {
    console.log("🚀 [CreateWorkshop] Aktiverar workshop...");
    if (!validateWorkshop()) return;

    if (!user?.id) {
      toast({
        title: t('common.error'),
        description: t('createWorkshop.loginRequired'),
        variant: "destructive",
      });
      return;
    }

    // Check workshop limit before creating new workshop
    if (!workshopId && !canCreateMore) {
      setShowUpgradeDialog(true);
      return;
    }

    console.log("=== AKTIVERAR WORKSHOP (VIA EDGE FUNCTION) ===");
    
    try {
      const { data, error } = await invokeWithAuth('workshop-operations', {
        operation: 'activate-workshop',
        workshopId: workshopId,
        workshop: {
          title: workshop.title,
          description: workshop.description,
          boards: workshop.boards.map((board, index) => ({
            title: board.title,
            timeLimit: board.timeLimit,
            colorIndex: board.colorIndex || index,
            questions: board.questions.map(q => ({ title: q.title })),
          })),
          code: workshop.code,
        },
      });

      if (error) throw error;

      if (data?.workshop) {
        setWorkshopId(data.workshop.id);
        setGeneratedCode(data.workshop.code);
      }

      // Öppna QR-dialog
      setShowQRDialog(true);

      toast({
        title: t('createWorkshop.activated'),
        description: t('createWorkshop.activatedDesc', { code: data?.workshop?.code || generatedCode }),
      });
    } catch (error) {
      console.error("Fel vid aktivering av workshop:", error);
      toast({
        title: t('common.error'),
        description: t('createWorkshop.saveFailed'),
        variant: "destructive",
      });
    }
  };

  const getJoinUrl = () => {
    return `${window.location.origin}/join?code=${generatedCode}`;
  };

  const downloadQRCode = () => {
    const svg = document.querySelector('#qr-code-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 300;
      canvas.height = 300;
      ctx!.fillStyle = 'white';
      ctx!.fillRect(0, 0, 300, 300);
      ctx!.drawImage(img, 0, 0, 300, 300);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `workshop-${generatedCode}-qr.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          
          toast({
            title: "QR-kod nedladdad!",
            description: "QR-koden har sparats som en bild",
          });
        }
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tillbaka till Dashboard
          </Button>
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Ny Workshop</span>
          </div>

          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
            Skapa Workshop
          </h1>
          <p className="text-muted-foreground">
            Bygg din interaktiva workshop med boards och frågor
          </p>
        </div>

        {/* Basic Info */}
        <Card className="mb-6 shadow-[var(--shadow-glow)] bg-gradient-to-br from-card to-muted/20">
          <CardHeader>
            <CardTitle>Grundinformation</CardTitle>
            <CardDescription>Beskriv din workshop</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Workshop Titel *</Label>
              <Input
                id="title"
                placeholder="T.ex. Strategi Workshop 2024"
                value={workshop.title}
                onChange={(e) =>
                  setWorkshop({ ...workshop, title: e.target.value })
                }
                className="text-lg font-semibold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beskrivning</Label>
              <Textarea
                id="description"
                placeholder="Beskriv syftet med workshopen..."
                value={workshop.description}
                onChange={(e) =>
                  setWorkshop({ ...workshop, description: e.target.value })
                }
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Boards Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Boards & Övningar</h2>
              <p className="text-sm text-muted-foreground">
                Lägg till olika övningar och frågor
              </p>
            </div>

            <Button onClick={addBoard} variant="default">
              <Plus className="w-4 h-4 mr-2" />
              Lägg till Board
            </Button>
          </div>

          {workshop.boards.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Inga boards än</h3>
                <p className="text-muted-foreground mb-4">
                  Börja med att lägga till ditt första board
                </p>
                <Button onClick={addBoard} variant="default">
                  <Plus className="w-4 h-4 mr-2" />
                  Lägg till Board
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {workshop.boards.map((board, index) => (
                <div
                  key={board.id}
                  draggable={!hasResponses}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={draggedBoardIndex === index ? "opacity-50" : ""}
                >
                  <BoardCard
                    board={board}
                    index={index}
                    onUpdate={(updated) => updateBoard(board.id, updated)}
                    onDelete={() => deleteBoard(board.id)}
                    isDraggable={!hasResponses}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Warning for published workshops with responses */}
        {hasResponses && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive text-sm font-medium">
              Du kan inte redigera en redan publicerad workshop som innehåller deltagarnas svar
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-4">
              <Button
                onClick={handleSaveDraft}
                variant="outline"
                size="lg"
                className="w-full"
                disabled={hasResponses || isLoadingResponses}
              >
                <Save className="w-5 h-5 mr-2" />
                Spara som Utkast
              </Button>

              <Button
                onClick={handleActivate}
                variant="hero"
                size="lg"
                className="w-full"
                disabled={hasResponses || isLoadingResponses}
              >
                <Play className="w-5 h-5 mr-2" />
                Aktivera Workshop
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Box */}
        <div className="mt-6 p-6 bg-muted/50 rounded-lg border border-border">
          <h3 className="font-semibold mb-2">💡 Tips för bra workshops</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Använd tydliga och specifika frågor</li>
            <li>• Sätt realistiska tidsgränser för varje board</li>
            <li>• Variera frågorna mellan reflektiva och kreativa</li>
            <li>• Färgkodning hjälper deltagare hålla koll på olika övningar</li>
          </ul>
        </div>
      </div>

      {/* QR Code Dialog */}
      <WorkshopQRDialog 
        code={generatedCode} 
        open={showQRDialog} 
        onOpenChange={setShowQRDialog}
      />

      {/* Workshop limit status for Free users */}
      {!workshopId && limit !== Infinity && (
        <p className="text-sm text-muted-foreground text-center mt-4">
          {activeWorkshops} av {limit} workshop använd
        </p>
      )}

      {/* Upgrade Required Dialog */}
      <UpgradeRequiredDialog 
        open={showUpgradeDialog} 
        onOpenChange={setShowUpgradeDialog}
      />
    </div>
  );
};

export default CreateWorkshop;

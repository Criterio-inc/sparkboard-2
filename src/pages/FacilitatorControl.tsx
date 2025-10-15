import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StickyNote } from "@/components/StickyNote";
import { ParticipantList } from "@/components/ParticipantList";
import { ControlPanel } from "@/components/ControlPanel";
import { AIAnalysisDialog } from "@/components/AIAnalysisDialog";
import { ArrowLeft, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { generateWorkshopPDF } from "@/utils/pdfExport";
import { getWorkshopById, SavedWorkshop } from "@/utils/workshopStorage";

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

interface Note {
  id: string;
  questionId: string;
  content: string;
  authorName: string;
  authorId: string;
  timestamp: string;
  colorIndex: number;
}

interface Participant {
  id: string;
  name: string;
  joinedAt: string;
  colorIndex: number;
}

// Demo-data borttagen. Riktiga data laddas från localStorage och sessionStorage.

const FacilitatorControl = () => {
  const { workshopId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentBoardIndex, setCurrentBoardIndex] = useState(0);
  const [workshop, setWorkshop] = useState<SavedWorkshop | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiAnalyses, setAIAnalyses] = useState<Record<string, string>>({});

  // Ladda workshop och boards
  useEffect(() => {
    if (!workshopId) return;
    const w = getWorkshopById(workshopId);
    if (!w) {
      toast({
        title: "Workshop saknas",
        description: "Kunde inte hitta workshopen. Återgår till dashboard.",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }
    setWorkshop(w);
    setBoards(w.boards || []);
    setCurrentBoardIndex(0);
    setTimeRemaining(((w.boards?.[0]?.timeLimit) || 0) * 60);
  }, [workshopId, navigate, toast]);

  // Synka deltagare från sessionStorage
  useEffect(() => {
    if (!workshop?.code) {
      setParticipants([]);
      return;
    }
    const key = `workshop_${workshop.code.toUpperCase()}_participants`;
    const read = () => {
      try {
        const data = JSON.parse(sessionStorage.getItem(key) || "[]");
        setParticipants(Array.isArray(data) ? data : []);
      } catch {
        setParticipants([]);
      }
    };
    read();
    const onUpdate = () => read();
    window.addEventListener("participants-updated", onUpdate);
    const interval = setInterval(read, 2000);
    return () => {
      window.removeEventListener("participants-updated", onUpdate);
      clearInterval(interval);
    };
  }, [workshop?.code]);

  const currentBoard = boards[currentBoardIndex] || { id: "empty", title: "Ingen övning", timeLimit: 0, questions: [], colorIndex: 0 };
  const boardColor = `hsl(var(--board-${(currentBoard.colorIndex % 5) + 1}))`;
  const isLowTime = timeRemaining <= 120 && timeRemaining > 0;
  const isTimeUp = timeRemaining === 0;

  // Timer logic
  useEffect(() => {
    if (!isTimerRunning) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          setIsTimerRunning(false);
          if (isSoundEnabled) {
            // Play sound alert
            const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0PVqzn77BdGAg+ltryxnMpBSuBzvLZiTYIG2m98OGenVEMD1as6O+wXRgIPpba8sZzKQUrgc7y2Yk2CBlpu+3mnl0RDFFq5u+zYxkHO5XX8sp2LAUngM7y24o3CRdnvO7kpF4UCkig4O68YRsFM4nU8dF+LwYsgs/y2YkxBxZpu+3mnl0RDFFq5u+zYxkHO5XX8sp2LAUngM7y24o3CRdnvO7kpF4UCkig4O68YRsFM4nU8dF+LwYsgs/y2YkxBxZpu+3mnl0RDFFq5u+zYxkHO5XX8sp2LAUngM7y24o3CRdnvO7kpF4UCkig4O68YRsFM4nU8dF+LwYsgs/y2YkxBxZpu+3mnl0RDFFq5u+zYxkHO5XX8sp2LAUngM7y24o3CRdnvO7kpF4UCkig4O68YRsFM4nU8dF+LwYsgs/y2YkxBxZpu+3mnl0RDFFq5u+zYxkHO5XX8sp2LAUngM7y24o3CRdnvO7kpF4UCkig4O68YRsFM4nU8dF+LwYsgs/y2YkxBxZpu+3mnl0RDFFq5u+zYxkHO5XX8sp2LAUngM7y24o3CRdnvO7kpF4UCkig4O68YRsFM4nU8dF+LwYsgs/y2YkxBxZpu+3mnl0RDFFq5u+zYxkHO5XX8sp2LAUngM7y24o3CRdnvO7kpF4UCkig4O68YRsFM4nU8dF+LwYsgs/y2YkxBxZpu+3mnl0RDFFq5u+zYxkHO5XX8sp2LAUngM7y24o3CRdnvO7kpF4UCkig4O68YRsFM4nU8dF+LwYsgs/y2YkxBxZpu+3mnl0RDFFq5u+zYxkHO5XX8sp2LAUngM7y24o3CRdnvO7kpF4UCkig4O68YRsFM4nU8dF+LwYsgs/y2YkxBxZpu+3mnl0RDFFq5u+zYxkHO5XX8sp2LAUngM7y24o3CRdnvO7kpF4UCkig4O68YRsFM4nU8dF+LwYsgs/y2YkxBxZpu+3mnl0RDFFq5u+zYxkHO5XX8sp2LAUngM7y24o3CRdnvO7kpF4UCkig4O68YRsFM4nU8dF+LwYsgs/y2YkxBxZpu+3mnl0RDFFq5u+zYxkHO5XX8sp2LAUngM7y24o3CRdnvO7kpF4UCkig4O68YRsFM4nU8dF+LwYsgs/y2YkxBxZpu+3mnl0RDFFq5u+zYxkHO5XX8sp2LAUngM7y24o3CRdnvO7kpF4UCkig4O68YRsFM4nU8dF+Lw==");
            audio.play().catch(console.error);
          }
          
          toast({
            title: "Tiden är ute!",
            description: "Boardens tidsgräns har nåtts",
            variant: "destructive",
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerRunning, isSoundEnabled, toast]);

  // Warning at 2 minutes
  useEffect(() => {
    if (timeRemaining === 120 && isTimerRunning) {
      toast({
        title: "2 minuter kvar!",
        description: "Boardens tid håller på att ta slut",
      });
    }
  }, [timeRemaining, isTimerRunning, toast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleNextBoard = () => {
    if (currentBoardIndex < boards.length - 1) {
      setCurrentBoardIndex(currentBoardIndex + 1);
      setTimeRemaining(boards[currentBoardIndex + 1].timeLimit * 60);
      setIsTimerRunning(false);
      
      toast({
        title: "Nästa board!",
        description: `Nu på: ${boards[currentBoardIndex + 1].title}`,
      });
    }
  };

  const handleAIAnalysis = () => {
    setShowAIDialog(true);
  };

  const handleExportPDF = () => {
    try {
      // Prepare notes grouped by board
      const notesByBoard: Record<string, Note[]> = {};
      boards.forEach((board) => {
        notesByBoard[board.id] = notes.filter((note) =>
          board.questions.some((q) => q.id === note.questionId)
        );
      });

      const exportData = {
        workshopTitle: workshop?.title || "Workshop",
        date: new Date().toLocaleDateString("sv-SE", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        boards,
        notesByBoard,
        aiAnalyses,
        participantCount: participants.length,
      };

      generateWorkshopPDF(exportData);

      toast({
        title: "PDF genererad!",
        description: "Din workshop-rapport har laddats ner",
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "Fel vid PDF-generering",
        description: "Kunde inte skapa PDF. Försök igen.",
        variant: "destructive",
      });
    }
  };

  const getNotesForQuestion = (questionId: string) => {
    return notes.filter((n) => n.questionId === questionId);
  };

  // Get all notes from current board with question titles
  const getCurrentBoardNotes = () => {
    return notes.map((note) => {
      const question = currentBoard.questions.find((q) => q.id === note.questionId);
      return {
        ...note,
        question: question?.title || "Unknown question",
      };
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div
        className="sticky top-0 z-10 border-b shadow-sm bg-background"
        style={{
          borderTopColor: boardColor,
          borderTopWidth: "4px",
        }}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>

              <div>
                <h1 className="text-2xl font-bold">Facilitator Control</h1>
                <p className="text-sm text-muted-foreground">Workshop: {workshop?.title || "—"}</p>
              </div>
            </div>

            {/* Timer Display */}
            <div
              className={`flex items-center gap-3 px-6 py-3 rounded-lg font-mono text-2xl font-bold transition-all ${
                isTimeUp
                  ? "bg-destructive/20 text-destructive animate-pulse"
                  : isLowTime
                  ? "bg-orange-500/20 text-orange-600 animate-pulse"
                  : ""
              }`}
              style={{
                backgroundColor: !isTimeUp && !isLowTime ? `${boardColor}20` : undefined,
                color: !isTimeUp && !isLowTime ? boardColor : undefined,
              }}
            >
              <Clock className="w-6 h-6" />
              {formatTime(timeRemaining)}
              {isLowTime && !isTimeUp && <AlertCircle className="w-6 h-6 animate-bounce" />}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Content - 3 columns */}
          <div className="lg:col-span-3 space-y-6">
            {/* Control Panel */}
            <ControlPanel
              isTimerRunning={isTimerRunning}
              onToggleTimer={() => setIsTimerRunning(!isTimerRunning)}
              onNextBoard={handleNextBoard}
              onAIAnalysis={handleAIAnalysis}
              onExportPDF={handleExportPDF}
              isSoundEnabled={isSoundEnabled}
              onToggleSound={() => setIsSoundEnabled(!isSoundEnabled)}
              canGoNext={currentBoardIndex < boards.length - 1}
            />

            {/* Board Navigation Tabs */}
            <Tabs
              value={currentBoard.id}
              onValueChange={(value) => {
                const index = boards.findIndex((b) => b.id === value);
                if (index !== -1) {
                  setCurrentBoardIndex(index);
                  setTimeRemaining(boards[index].timeLimit * 60);
                  setIsTimerRunning(false);
                }
              }}
            >
              <TabsList className="w-full justify-start overflow-x-auto">
                {boards.map((board, index) => {
                  const color = `hsl(var(--board-${(board.colorIndex % 5) + 1}))`;
                  return (
                    <TabsTrigger
                      key={board.id}
                      value={board.id}
                      className="flex items-center gap-2"
                      style={{
                        borderTop: currentBoard.id === board.id ? `3px solid ${color}` : undefined,
                      }}
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      Board {index + 1}: {board.title}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {boards.map((board) => (
                <TabsContent key={board.id} value={board.id} className="mt-6">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {board.questions.map((question) => {
                      const questionNotes = getNotesForQuestion(question.id);
                      const qBoardColor = `hsl(var(--board-${(board.colorIndex % 5) + 1}))`;

                      return (
                        <Card key={question.id} className="p-6 space-y-4">
                          <div>
                            <h2 className="text-lg font-semibold mb-1" style={{ color: qBoardColor }}>
                              {question.title}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                              {questionNotes.length} {questionNotes.length === 1 ? "note" : "notes"}
                            </p>
                          </div>

                          <div className="space-y-3 min-h-[200px]">
                            {questionNotes.length === 0 ? (
                              <div className="flex items-center justify-center h-40 border-2 border-dashed border-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">Inga notes än</p>
                              </div>
                            ) : (
                              questionNotes.map((note) => (
                                <StickyNote key={note.id} {...note} isOwn={false} />
                              ))
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* Sidebar - 1 column */}
          <div className="lg:col-span-1">
            <ParticipantList participants={participants} />
          </div>
        </div>

        {/* AI Analysis Dialog */}
        <AIAnalysisDialog
          open={showAIDialog}
          onOpenChange={setShowAIDialog}
          notes={getCurrentBoardNotes()}
          boardTitle={currentBoard.title}
          onAnalysisComplete={(analysis) => {
            setAIAnalyses({
              ...aiAnalyses,
              [currentBoard.id]: analysis,
            });
          }}
        />
      </div>
    </div>
  );
};

export default FacilitatorControl;

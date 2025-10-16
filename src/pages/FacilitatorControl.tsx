import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StickyNote } from "@/components/StickyNote";
import { ParticipantList } from "@/components/ParticipantList";
import { ControlPanel } from "@/components/ControlPanel";
import { AIAnalysisDialog } from "@/components/AIAnalysisDialog";
import { ArrowLeft, Clock, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { generateWorkshopPDF } from "@/utils/pdfExport";
import { supabase } from "@/integrations/supabase/client";

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
  const [workshop, setWorkshop] = useState<any>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiAnalyses, setAIAnalyses] = useState<Record<string, string>>({});
  const [isControlPanelVisible, setIsControlPanelVisible] = useState(true);

  // Ladda workshop och boards från Supabase
  useEffect(() => {
    const loadWorkshop = async () => {
      if (!workshopId) return;

      try {
        console.log("🔄 [Facilitator] Laddar workshop:", workshopId);

        // Hämta workshop
        const { data: workshopData, error: workshopError } = await supabase
          .from('workshops')
          .select('*')
          .eq('id', workshopId)
          .single();

        if (workshopError || !workshopData) {
          toast({
            title: "Workshop saknas",
            description: "Kunde inte hitta workshopen. Återgår till dashboard.",
            variant: "destructive",
          });
          navigate("/dashboard");
          return;
        }

        setWorkshop(workshopData);

        // Hämta boards
        const { data: boardsData, error: boardsError } = await supabase
          .from('boards')
          .select('*')
          .eq('workshop_id', workshopId)
          .order('order_index');

        if (boardsError) {
          console.error("Fel vid hämtning av boards:", boardsError);
          setBoards([]);
          return;
        }

        // Hämta frågor för varje board
        const boardsWithQuestions = await Promise.all(
          (boardsData || []).map(async (board) => {
            const { data: questions } = await supabase
              .from('questions')
              .select('*')
              .eq('board_id', board.id)
              .order('order_index');

            return {
              id: board.id,
              title: board.title,
              timeLimit: board.time_limit,
              colorIndex: board.color_index,
              questions: (questions || []).map(q => ({
                id: q.id,
                title: q.title,
              })),
            };
          })
        );

        setBoards(boardsWithQuestions);
        setCurrentBoardIndex(0);
        setTimeRemaining((boardsWithQuestions[0]?.timeLimit || 0) * 60);

        console.log("✅ [Facilitator] Workshop laddad:", workshopData.name);
      } catch (error) {
        console.error("Fel vid laddning av workshop:", error);
        toast({
          title: "Fel",
          description: "Kunde inte ladda workshop-data",
          variant: "destructive",
        });
        navigate("/dashboard");
      }
    };

    loadWorkshop();
  }, [workshopId, navigate, toast]);

  // Synka deltagare från Supabase Realtime
  useEffect(() => {
    if (!workshop?.id) {
      setParticipants([]);
      return;
    }

    const fetchParticipants = async () => {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('workshop_id', workshop.id)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error("Fel vid hämtning av deltagare:", error);
        return;
      }

      const formattedParticipants: Participant[] = (data || []).map(p => ({
        id: p.id,
        name: p.name,
        joinedAt: new Date(p.joined_at).toLocaleTimeString('sv-SE', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        colorIndex: p.color_index,
      }));

      setParticipants(formattedParticipants);
      console.log("👥 [Facilitator] Deltagare:", formattedParticipants.length);
    };

    fetchParticipants();

    // Lyssna på realtime-uppdateringar
    const channel = supabase
      .channel(`participants-${workshop.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `workshop_id=eq.${workshop.id}`,
        },
        () => {
          console.log("🔔 [Facilitator] Participant update");
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workshop?.id]);

  // Synka notes från Supabase Realtime
  useEffect(() => {
    if (!workshop?.id || boards.length === 0) {
      setNotes([]);
      return;
    }

    const fetchNotes = async () => {
      // Hämta alla frågor från alla boards
      const allQuestionIds = boards.flatMap(b => b.questions.map(q => q.id));
      if (allQuestionIds.length === 0) return;

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .in('question_id', allQuestionIds);

      if (error) {
        console.error("Fel vid hämtning av notes:", error);
        return;
      }

      const formattedNotes: Note[] = (data || []).map(note => ({
        id: note.id,
        questionId: note.question_id,
        content: note.content,
        authorName: note.author_name,
        authorId: note.author_id,
        timestamp: new Date(note.timestamp).toLocaleTimeString("sv-SE", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        colorIndex: note.color_index,
      }));

      setNotes(formattedNotes);
      console.log("📝 [Facilitator] Notes:", formattedNotes.length);
    };

    fetchNotes();

    // Lyssna på realtime-uppdateringar
    const channel = supabase
      .channel(`notes-workshop-${workshop.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
        },
        () => {
          console.log("🔔 [Facilitator] Note update");
          fetchNotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workshop?.id, boards]);

  const currentBoard = boards[currentBoardIndex] || { id: "empty", title: "Ingen övning", timeLimit: 0, questions: [], colorIndex: 0 };
  const boardColor = `hsl(var(--board-${(currentBoard.colorIndex % 5) + 1}))`;
  const isLowTime = timeRemaining <= 120 && timeRemaining > 0;
  const isTimeUp = timeRemaining === 0;

  // Timer logic - sync with database
  useEffect(() => {
    if (!isTimerRunning) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          setIsTimerRunning(false);
          
          // Uppdatera timer state i Supabase när timern stannar
          if (workshop?.id) {
            supabase
              .from('workshops')
              .update({ 
                timer_running: false,
                time_remaining: 0
              })
              .eq('id', workshop.id)
              .then(({ error }) => {
                if (error) console.error("Kunde inte uppdatera timer state:", error);
              });
          }
          
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
  }, [isTimerRunning, isSoundEnabled, toast, workshop?.id]);

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

  const handleNextBoard = async () => {
    if (currentBoardIndex < boards.length - 1) {
      const nextBoard = boards[currentBoardIndex + 1];
      
      // Uppdatera active_board_id och återställ timer state i Supabase
      const { error } = await supabase
        .from('workshops')
        .update({ 
          active_board_id: nextBoard.id,
          timer_running: false,
          timer_started_at: null,
          time_remaining: null
        })
        .eq('id', workshop.id);
      
      if (error) {
        console.error("Fel vid uppdatering av active board:", error);
        toast({
          title: "Fel",
          description: "Kunde inte byta board",
          variant: "destructive",
        });
        return;
      }
      
      setCurrentBoardIndex(currentBoardIndex + 1);
      setTimeRemaining(nextBoard.timeLimit * 60);
      setIsTimerRunning(false);
      
      console.log("✅ [Facilitator] Bytte till board:", nextBoard.title);
      
      toast({
        title: "Nästa board!",
        description: `Nu på: ${nextBoard.title}`,
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
        workshopTitle: workshop?.name || "Workshop",
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

  const handleDeleteNote = async (noteId: string) => {
    try {
      console.log("🗑️ [Facilitator] Tar bort note:", noteId);

      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (error) {
        console.error("Kunde inte ta bort note:", error);
        toast({
          title: "Fel",
          description: "Kunde inte ta bort note",
          variant: "destructive",
        });
        return;
      }

      console.log("✅ [Facilitator] Note borttagen från Supabase");
      
      toast({
        title: "Note borttagen",
        description: "Sticky note har tagits bort",
      });
      
      // Realtime kommer automatiskt uppdatera notes-state
    } catch (error) {
      console.error("Fel vid borttagning av note:", error);
    }
  };

  const handleDeleteParticipant = async (participantId: string) => {
    try {
      console.log("🗑️ [Facilitator] Tar bort deltagare:", participantId);

      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('id', participantId);

      if (error) {
        console.error("Kunde inte ta bort deltagare:", error);
        toast({
          title: "Fel",
          description: "Kunde inte ta bort deltagare",
          variant: "destructive",
        });
        return;
      }

      console.log("✅ [Facilitator] Deltagare borttagen från Supabase");
      
      toast({
        title: "Deltagare borttagen",
        description: "Deltagaren har tagits bort från workshopen",
      });
      
      // Realtime kommer automatiskt uppdatera participants-state
    } catch (error) {
      console.error("Fel vid borttagning av deltagare:", error);
    }
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
                <p className="text-sm text-muted-foreground">Workshop: {workshop?.name || "—"}</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content - 3 columns on desktop, full width on mobile/tablet */}
          <div className="lg:col-span-3 space-y-6">
            {/* Control Panel - kan gömmas för presentation */}
            {isControlPanelVisible ? (
              <div className="relative">
                <ControlPanel
                  isTimerRunning={isTimerRunning}
                  onToggleTimer={async () => {
                    const newRunningState = !isTimerRunning;
                    setIsTimerRunning(newRunningState);
                    
                    if (workshop?.id) {
                      const updateData = newRunningState 
                        ? { 
                            timer_running: true, 
                            timer_started_at: new Date().toISOString(),
                            time_remaining: null
                          }
                        : { 
                            timer_running: false, 
                            timer_started_at: null,
                            time_remaining: timeRemaining
                          };
                      
                      const { error } = await supabase
                        .from('workshops')
                        .update(updateData)
                        .eq('id', workshop.id);
                      
                      if (error) {
                        console.error("Kunde inte uppdatera timer state:", error);
                        toast({
                          title: "Fel",
                          description: "Kunde inte uppdatera timer",
                          variant: "destructive",
                        });
                      } else {
                        console.log("✅ Timer state uppdaterad:", newRunningState ? "Startad" : "Pausad");
                      }
                    }
                  }}
                  onNextBoard={handleNextBoard}
                  onAIAnalysis={handleAIAnalysis}
                  onExportPDF={handleExportPDF}
                  isSoundEnabled={isSoundEnabled}
                  onToggleSound={() => setIsSoundEnabled(!isSoundEnabled)}
                  canGoNext={currentBoardIndex < boards.length - 1}
                />
                
                {/* Toggle-knapp för att gömma panelen */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsControlPanelVisible(false)}
                  className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm hover:bg-background"
                >
                  <EyeOff className="w-4 h-4 mr-2" />
                  Dölj kontroller
                </Button>
              </div>
            ) : (
              /* Floating-knapp för att visa panelen igen */
              <Button
                variant="default"
                size="lg"
                onClick={() => setIsControlPanelVisible(true)}
                className="fixed bottom-6 right-6 z-50 shadow-lg"
              >
                <Eye className="w-5 h-5 mr-2" />
                Visa kontroller
              </Button>
            )}

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
                                <StickyNote 
                                  key={note.id} 
                                  {...note} 
                                  isOwn={false}
                                  onDelete={() => handleDeleteNote(note.id)}
                                />
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

          {/* Sidebar - 1 column on desktop, hidden on mobile/tablet (shows in separate tab/view) */}
          <div className="hidden lg:block lg:col-span-1">
            <ParticipantList 
              participants={participants} 
              onDeleteParticipant={handleDeleteParticipant}
            />
          </div>
          
          {/* Mobile/Tablet ParticipantList - shown below boards */}
          <div className="lg:hidden mt-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Deltagare</h3>
              <ParticipantList 
                participants={participants}
                onDeleteParticipant={handleDeleteParticipant}
              />
            </Card>
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

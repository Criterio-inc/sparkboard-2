import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StickyNote } from "@/components/StickyNote";
import { ParticipantList } from "@/components/ParticipantList";
import { ControlPanel } from "@/components/ControlPanel";
import { AIAnalysisDialog } from "@/components/AIAnalysisDialog";
import { ImportNotesDialog } from "@/components/ImportNotesDialog";
import { ArrowLeft, Clock, AlertCircle, Eye, EyeOff, QrCode } from "lucide-react";
import { WorkshopQRDialog } from "@/components/WorkshopQRDialog";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { generateWorkshopPDF } from "@/utils/pdfExport";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
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
  const { t } = useLanguage();
  const { invokeWithAuth } = useAuthenticatedFunctions();

  const [currentBoardIndex, setCurrentBoardIndex] = useState(0);
  const [workshop, setWorkshop] = useState<any>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [aiAnalyses, setAIAnalyses] = useState<Record<string, string>>({});
  const [isControlPanelVisible, setIsControlPanelVisible] = useState(true);
  const [isParticipantListVisible, setIsParticipantListVisible] = useState(true);
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);

  // Ladda workshop och boards från edge function
  useEffect(() => {
    const loadWorkshop = async () => {
      if (!workshopId) return;

      try {
        console.log("🔄 [Facilitator] Laddar workshop:", workshopId);

        // Use edge function to load workshop (Clerk JWT verified there)
        const { data, error } = await invokeWithAuth('workshop-operations', {
          operation: 'get-workshop',
          workshopId: workshopId
        });

        if (error || data?.error || !data?.workshop) {
          toast({
            title: t('facilitator.workshopMissing'),
            description: t('facilitator.workshopMissingDesc'),
            variant: "destructive",
          });
          navigate("/dashboard");
          return;
        }

        setWorkshop(data.workshop);

        // Transform boards data
        const boardsWithQuestions = (data.boards || []).map((board: any) => ({
          id: board.id,
          title: board.title,
          timeLimit: board.time_limit,
          colorIndex: board.color_index,
          questions: (board.questions || []).map((q: any) => ({
            id: q.id,
            title: q.title,
          })),
        }));

        setBoards(boardsWithQuestions);
        setCurrentBoardIndex(0);
        setTimeRemaining((boardsWithQuestions[0]?.timeLimit || 0) * 60);

        console.log("✅ [Facilitator] Workshop laddad:", data.workshop.name);
      } catch (error) {
        console.error("Fel vid laddning av workshop:", error);
        toast({
          title: t('facilitator.loadError'),
          description: t('facilitator.loadErrorDesc'),
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

  // Ladda AI-analyser från databasen
  useEffect(() => {
    const loadAIAnalyses = async () => {
      if (!workshop?.id || boards.length === 0) return;

      console.log('🤖 Laddar AI-analyser från databas...');

      // Hämta senaste analys för varje board
      const analysesPromises = boards.map(async (board) => {
        const { data } = await supabase
          .from('ai_analyses')
          .select('*')
          .eq('board_id', board.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return data ? { boardId: board.id, analysis: data.analysis } : null;
      });

      const results = await Promise.all(analysesPromises);
      
      // Bygg aiAnalyses objekt med board.id som key
      const loadedAnalyses: Record<string, string> = {};
      results.forEach(result => {
        if (result) {
          loadedAnalyses[result.boardId] = result.analysis;
        }
      });

      setAIAnalyses(loadedAnalyses);
      console.log(`✅ Laddade ${Object.keys(loadedAnalyses).length} AI-analyser`);
    };

    loadAIAnalyses();

    // Lyssna på nya AI-analyser i realtid
    const channel = supabase
      .channel(`ai-analyses-workshop-${workshop?.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_analyses',
        },
        (payload) => {
          console.log('🔔 Ny AI-analys skapad', payload);
          
          // Uppdatera state med ny analys
          const newAnalysis = payload.new as any;
          setAIAnalyses(prev => ({
            ...prev,
            [newAnalysis.board_id]: newAnalysis.analysis
          }));
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
          
          toast({
            title: t('facilitator.timeUp'),
            description: t('facilitator.timeUpDesc'),
            variant: "destructive",
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerRunning, toast, workshop?.id]);

  // Warning at 2 minutes
  useEffect(() => {
    if (timeRemaining === 120 && isTimerRunning) {
      toast({
        title: t('facilitator.twoMinutesLeft'),
        description: t('facilitator.twoMinutesLeftDesc'),
      });
    }
  }, [timeRemaining, isTimerRunning, toast, t]);

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
          title: t('facilitator.switchError'),
          description: t('facilitator.switchErrorDesc'),
          variant: "destructive",
        });
        return;
      }
      
      setCurrentBoardIndex(currentBoardIndex + 1);
      setTimeRemaining(nextBoard.timeLimit * 60);
      setIsTimerRunning(false);
      
      console.log("✅ [Facilitator] Bytte till board:", nextBoard.title);
      
      toast({
        title: t('facilitator.nextBoardToast'),
        description: t('facilitator.nextBoardDesc', { title: nextBoard.title }),
      });
    }
  };

  const handleAIAnalysis = () => {
    setShowAIDialog(true);
  };

  const handleExportPDF = async () => {
    try {
      // Prepare notes grouped by board
      const notesByBoard: Record<string, Note[]> = {};
      boards.forEach((board) => {
        notesByBoard[board.id] = notes.filter((note) =>
          board.questions.some((q) => q.id === note.questionId)
        );
      });

      // DEBUG: Visa vilka AI-analyser som inkluderas
      console.group('📊 PDF Export Data');
      console.log('Workshop:', workshop?.name);
      console.log('Boards:', boards.length);
      console.log('Total notes:', notes.length);
      console.log('AI Analyses included:', Object.keys(aiAnalyses).length);
      boards.forEach((board, i) => {
        const hasAnalysis = !!aiAnalyses[board.id];
        console.log(`Board ${i + 1} (${board.title}):`, 
          `${notesByBoard[board.id]?.length || 0} notes,`,
          hasAnalysis ? '✅ AI-analys' : '❌ Ingen AI-analys'
        );
      });
      console.groupEnd();

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

      await generateWorkshopPDF(exportData);

      toast({
        title: t('facilitator.pdfGenerated'),
        description: t('facilitator.pdfGeneratedDesc'),
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: t('facilitator.pdfError'),
        description: t('facilitator.pdfErrorDesc'),
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
          title: t('facilitator.deleteError'),
          description: t('facilitator.deleteErrorDesc'),
          variant: "destructive",
        });
        return;
      }

      console.log("✅ [Facilitator] Note borttagen från Supabase");
      
      toast({
        title: t('facilitator.noteDeleted'),
        description: t('facilitator.noteDeletedDesc'),
      });
      
      // Realtime kommer automatiskt uppdatera notes-state
    } catch (error) {
      console.error("Fel vid borttagning av note:", error);
    }
  };

  const handleMoveNote = async (noteId: string, targetQuestionId: string) => {
    try {
      console.log("🔄 [Facilitator] Flyttar note:", noteId, "till question:", targetQuestionId);

      const { error } = await supabase
        .from('notes')
        .update({ question_id: targetQuestionId })
        .eq('id', noteId);

      if (error) {
        console.error("Kunde inte flytta note:", error);
        toast({
          title: t('facilitator.moveError'),
          description: t('facilitator.moveErrorDesc'),
          variant: "destructive",
        });
        return;
      }

      console.log("✅ [Facilitator] Note flyttad");
      
      toast({
        title: t('facilitator.noteMoved'),
        description: t('facilitator.noteMovedDesc'),
      });
    } catch (error) {
      console.error("Fel vid flyttning av note:", error);
    } finally {
      setDraggedNoteId(null);
    }
  };

  const handleDeleteParticipant = async (participantId: string) => {
    try {
      console.log("🗑️ [Facilitator] Tar bort deltagare:", participantId);

      // First, delete all notes created by this participant
      const { error: notesError } = await supabase
        .from('notes')
        .delete()
        .eq('author_id', participantId);

      if (notesError) {
        console.error("Kunde inte ta bort deltagarens anteckningar:", notesError);
        toast({
          title: t('facilitator.participantDeleteError'),
          description: t('facilitator.participantNotesDeleteError'),
          variant: "destructive",
        });
        return;
      }

      // Then delete the participant
      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('id', participantId);

      if (error) {
        console.error("Kunde inte ta bort deltagare:", error);
        toast({
          title: t('facilitator.participantDeleteError'),
          description: t('facilitator.participantDeleteErrorDesc'),
          variant: "destructive",
        });
        return;
      }

      console.log("✅ [Facilitator] Deltagare och anteckningar borttagna från Supabase");
      
      toast({
        title: t('facilitator.participantDeleted'),
        description: t('facilitator.participantDeletedDesc'),
      });
      
      // Realtime kommer automatiskt uppdatera participants-state
    } catch (error) {
      console.error("Fel vid borttagning av deltagare:", error);
    }
  };

  // Get all notes from current board with question titles
  const getCurrentBoardNotes = () => {
    // KRITISK FIX: Filtrera endast notes som tillhör current board's frågor
    const currentBoardQuestionIds = currentBoard.questions.map(q => q.id);
    
    return notes
      .filter((note) => currentBoardQuestionIds.includes(note.questionId))
      .map((note) => {
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
                <h1 className="text-2xl font-semibold tracking-tight">Facilitator Control</h1>
                <p className="text-sm text-muted-foreground">Workshop: {workshop?.name || "—"}</p>
              </div>
              
              {workshop?.code && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowQRDialog(true)}
                  className="ml-4"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  {t('facilitator.showQR')}
                </Button>
              )}
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
                            title: t('common.error'),
                            description: t('facilitator.timerUpdateError'),
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
                  onImportNotes={() => setShowImportDialog(true)}
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
                  {t('control.hideControls')}
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
                {t('control.showControls')}
              </Button>
            )}

            {/* Board Navigation Tabs */}
            <Tabs
              value={currentBoard.id}
              onValueChange={async (value) => {
                const index = boards.findIndex((b) => b.id === value);
                if (index !== -1) {
                  // Update active_board_id in Supabase to sync participants
                  if (workshop?.id) {
                    const { error } = await supabase
                      .from('workshops')
                      .update({ 
                        active_board_id: value,
                        timer_running: false,
                        timer_started_at: null,
                        time_remaining: null
                      })
                      .eq('id', workshop.id);
                    
                    if (error) {
                      console.error("Could not update active board:", error);
                      toast({
                        title: t('common.error'),
                        description: t('facilitator.couldNotSwitchBoard'),
                        variant: "destructive",
                      });
                      return;
                    }
                  }
                  
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

              {boards.map((board) => {
                // Dynamisk grid baserat på antal frågor
                const questionCount = board.questions.length;
                const questionGridClass = questionCount === 1
                  ? "grid-cols-1"
                  : questionCount === 2
                  ? "grid-cols-1 md:grid-cols-2"
                  : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
                
                // Dynamisk notes-grid baserat på antal frågor
                const getNotesGridClass = (noteCount: number) => {
                  if (questionCount === 1) {
                    return "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3";
                  }
                  if (questionCount === 2) {
                    return "grid grid-cols-2 md:grid-cols-3 gap-3";
                  }
                  return "flex flex-wrap gap-3";
                };

                return (
                  <TabsContent key={board.id} value={board.id} className="mt-6">
                    <div className={`grid ${questionGridClass} gap-6`}>
                      {board.questions.map((question) => {
                        const questionNotes = getNotesForQuestion(question.id);
                        const qBoardColor = `hsl(var(--board-${(board.colorIndex % 5) + 1}))`;

                        return (
                          <Card 
                            key={question.id} 
                            className={`p-4 space-y-3 hover:shadow-[var(--shadow-button-hover)] transition-all duration-200 ${
                              draggedNoteId ? 'ring-2 ring-primary/30 ring-dashed' : ''
                            }`}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.currentTarget.classList.add('bg-primary/10');
                            }}
                            onDragLeave={(e) => {
                              e.currentTarget.classList.remove('bg-primary/10');
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.currentTarget.classList.remove('bg-primary/10');
                              const noteId = e.dataTransfer.getData('text/plain');
                              if (noteId && draggedNoteId) {
                                // Kontrollera att noten inte redan är i denna fråga
                                const note = notes.find(n => n.id === noteId);
                                if (note && note.questionId !== question.id) {
                                  handleMoveNote(noteId, question.id);
                                } else {
                                  setDraggedNoteId(null);
                                }
                              }
                            }}
                          >
                            <div>
                              <h2 className="text-[0.95rem] font-semibold mb-1 leading-tight tracking-tight" style={{ color: qBoardColor }}>
                                {question.title}
                              </h2>
                              <p className="text-xs text-muted-foreground">
                                {questionNotes.length} {t('board.notes')}
                              </p>
                            </div>

                            <div className={`${getNotesGridClass(questionNotes.length)} min-h-[200px]`}>
                              {questionNotes.length === 0 ? (
                                <div className="flex items-center justify-center h-40 border-2 border-dashed border-muted rounded-lg col-span-full">
                                  <p className="text-sm text-muted-foreground">{t('board.noNotesYet')}</p>
                                </div>
                              ) : (
                                questionNotes.map((note) => (
                                  <StickyNote 
                                    key={note.id} 
                                    {...note} 
                                    isOwn={false}
                                    canDelete={true}
                                    draggable={true}
                                    onDelete={() => handleDeleteNote(note.id)}
                                    onDragStart={(id) => setDraggedNoteId(id)}
                                    onDragEnd={() => setDraggedNoteId(null)}
                                  />
                                ))
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>

          {/* Sidebar - 1 column on desktop, hidden on mobile/tablet (shows in separate tab/view) */}
          <div className="hidden lg:block lg:col-span-1 space-y-2">
            {/* Toggle-knapp för deltagarlistan */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsParticipantListVisible(!isParticipantListVisible)}
              className="w-full justify-start gap-2"
            >
              {isParticipantListVisible ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  {t('control.hideParticipants')}
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  {t('control.showParticipants')}
                </>
              )}
            </Button>
            
            {/* Deltagarlistan med smooth animation */}
            <div 
              className={`transition-all duration-300 overflow-hidden ${
                isParticipantListVisible ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <ParticipantList 
                participants={participants} 
                onDeleteParticipant={handleDeleteParticipant}
              />
            </div>
          </div>
          
          {/* Mobile/Tablet ParticipantList - shown below boards */}
          <div className="lg:hidden mt-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">{t('facilitator.participants')}</h3>
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
          boardId={currentBoard.id}
          boardTitle={currentBoard.title}
          onAnalysisComplete={(analysis) => {
            setAIAnalyses({
              ...aiAnalyses,
              [currentBoard.id]: analysis,
            });
          }}
        />
        
        {/* QR Dialog */}
        <WorkshopQRDialog 
          code={workshop?.code || ""} 
          open={showQRDialog} 
          onOpenChange={setShowQRDialog}
        />

        {/* Import Notes Dialog */}
        <ImportNotesDialog
          open={showImportDialog}
          onOpenChange={setShowImportDialog}
          currentBoard={currentBoard}
          allBoards={boards}
          allNotes={notes}
          workshopId={workshop?.id || ""}
          onImportComplete={() => {
            // Notes will refresh via realtime subscription
          }}
        />
      </div>
    </div>
  );
};

export default FacilitatorControl;

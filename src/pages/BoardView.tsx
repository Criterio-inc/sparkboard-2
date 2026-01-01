import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StickyNote } from "@/components/StickyNote";
import { AddNoteDialog } from "@/components/AddNoteDialog";
import { Plus, ArrowLeft, Clock, Users, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
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

const BoardView = () => {
  const { workshopId, boardId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [board, setBoard] = useState<Board | null>(null);
  const [workshopTitle, setWorkshopTitle] = useState("");
  const [workshopCode, setWorkshopCode] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [participantName, setParticipantName] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [participantCount, setParticipantCount] = useState(1);

  // Load workshop and participant session from Supabase
  useEffect(() => {
    const loadWorkshopData = async () => {
      // Load participant session
      const sessionData = sessionStorage.getItem('participantSession');
      if (!sessionData) {
        toast({
          title: "Session saknas",
          description: "Du måste gå med i workshopen igen",
          variant: "destructive",
        });
        navigate('/join');
        return;
      }

      const session = JSON.parse(sessionData);
      setParticipantName(session.participantName);
      setParticipantId(session.participantId);
      setWorkshopCode(session.workshopCode || '');

      if (!workshopId || !boardId) {
        navigate('/join');
        return;
      }

      try {
        // Hämta workshop från Supabase
        const { data: workshop, error: workshopError } = await supabase
          .from('workshops')
          .select('*')
          .eq('id', workshopId)
          .single();

        if (workshopError || !workshop) {
          toast({
            title: "Workshop hittades inte",
            description: "Kontrollera att workshop-koden är korrekt",
            variant: "destructive",
          });
          navigate('/join');
          return;
        }

        setWorkshopTitle(workshop.name);

        // Hämta board med frågor från Supabase
        const { data: boardData, error: boardError } = await supabase
          .from('boards')
          .select('*')
          .eq('id', boardId)
          .single();

        if (boardError || !boardData) {
          toast({
            title: "Board hittades inte",
            description: "Denna övning kunde inte hittas",
            variant: "destructive",
          });
          navigate('/join');
          return;
        }

        // Hämta frågor för denna board
        const { data: questions, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .eq('board_id', boardId)
          .order('order_index');

        if (questionsError) {
          console.error("Kunde inte hämta frågor:", questionsError);
        }

        const currentBoard: Board = {
          id: boardData.id,
          title: boardData.title,
          timeLimit: boardData.time_limit,
          colorIndex: boardData.color_index,
          questions: (questions || []).map(q => ({
            id: q.id,
            title: q.title,
          })),
        };

        setBoard(currentBoard);
        setTimeRemaining(currentBoard.timeLimit * 60);
      } catch (error) {
        console.error("Fel vid laddning av workshop-data:", error);
        toast({
          title: "Fel",
          description: "Kunde inte ladda workshop-data",
          variant: "destructive",
        });
        navigate('/join');
      }
    };

    loadWorkshopData();
  }, [workshopId, boardId, navigate, toast]);

  // Synka notes från Supabase Realtime
  useEffect(() => {
    if (!board) return;

    console.log("🔄 [Participant] Sätter upp realtime för notes på board:", board.id);

    // Hämta initial data från Supabase
    const fetchNotes = async () => {
      const questionIds = board.questions.map(q => q.id);
      if (questionIds.length === 0) return;

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .in('question_id', questionIds);

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
      console.log("📝 [Participant] Hämtade notes:", formattedNotes.length);
    };

    fetchNotes();

    // Lyssna på realtime-uppdateringar
    const channel = supabase
      .channel(`notes-board-${board.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
        },
        (payload) => {
          console.log("🔔 [Participant] Realtime update:", payload.eventType);
          fetchNotes(); // Refresh all notes
        }
      )
      .subscribe();

    return () => {
      console.log("🔌 [Participant] Kopplar från realtime");
      supabase.removeChannel(channel);
    };
  }, [board]);

  // Lyssna på ändringar i active_board_id för automatisk synkning
  useEffect(() => {
    if (!workshopId) return;

    console.log("🔄 [Participant] Lyssnar på board-ändringar för workshop:", workshopId);

    const channel = supabase
      .channel(`workshop-active-board-${workshopId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'workshops',
          filter: `id=eq.${workshopId}`
        },
        async (payload) => {
          const newActiveBoardId = payload.new.active_board_id;
          
          if (newActiveBoardId && newActiveBoardId !== boardId) {
            console.log("🔔 [Participant] Board ändrad till:", newActiveBoardId);
            
            toast({
              title: t('board.movedToNext'),
              description: t('board.syncing'),
            });
            
            // Navigera till nytt board
            navigate(`/board/${workshopId}/${newActiveBoardId}`);
          }
        }
      )
      .subscribe();

    return () => {
      console.log("🔌 [Participant] Kopplar från board-synkning");
      supabase.removeChannel(channel);
    };
  }, [workshopId, boardId, navigate, toast, t]);

  // Sync board when screen becomes visible (wake from sleep)
  useEffect(() => {
    if (!workshopId || !boardId) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log("👁️ [Participant] Screen became visible, syncing board...");

        // Clear any pending sync timeout
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }

        // Debounce sync to prevent multiple rapid calls
        syncTimeoutRef.current = setTimeout(async () => {
          try {
            const { data: workshop, error } = await supabase
              .from('workshops')
              .select('active_board_id')
              .eq('id', workshopId)
              .single();

            if (error) {
              console.error("Error syncing board:", error);
              return;
            }

            if (workshop?.active_board_id && workshop.active_board_id !== boardId) {
              console.log("🔄 [Participant] Board changed while away, navigating to:", workshop.active_board_id);
              
              toast({
                title: t('board.movedToNext'),
                description: t('board.syncing'),
              });

              navigate(`/board/${workshopId}/${workshop.active_board_id}`);
            } else {
              console.log("✅ [Participant] Board is up to date");
            }
          } catch (error) {
            console.error("Error in visibility sync:", error);
          }
        }, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [workshopId, boardId, navigate, toast, t]);

  // Synka deltagarantal från Supabase Realtime
  useEffect(() => {
    if (!workshopId) return;

    const fetchParticipantCount = async () => {
      const { count, error } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('workshop_id', workshopId);

      if (error) {
        console.error("Fel vid hämtning av deltagare:", error);
        return;
      }

      setParticipantCount(count || 0);
      console.log("👥 [Participant] Deltagarantal:", count);
    };

    fetchParticipantCount();

    // Lyssna på realtime-uppdateringar för deltagare
    const channel = supabase
      .channel(`participants-${workshopId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `workshop_id=eq.${workshopId}`,
        },
        () => {
          fetchParticipantCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workshopId]);

  // Sync timer from workshop in Supabase (controlled by facilitator)
  useEffect(() => {
    if (!workshopId) return;

    const fetchTimerState = async () => {
      const { data, error } = await supabase
        .from('workshops')
        .select('timer_running, timer_started_at, time_remaining')
        .eq('id', workshopId)
        .single();

      if (error || !data) {
        console.error("Fel vid hämtning av timer state:", error);
        return;
      }

      if (data.timer_running && data.timer_started_at && board) {
        // Beräkna återstående tid baserat på när timern startades
        const startTime = new Date(data.timer_started_at).getTime();
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - startTime) / 1000);
        const totalSeconds = board.timeLimit * 60;
        const remaining = Math.max(0, totalSeconds - elapsedSeconds);
        setTimeRemaining(remaining);
      } else if (data.time_remaining !== null) {
        // Timer pausad, visa återstående tid
        setTimeRemaining(data.time_remaining);
      }
    };

    fetchTimerState();

    // Lyssna på realtime uppdateringar av timer state
    const channel = supabase
      .channel(`workshop-timer-${workshopId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'workshops',
          filter: `id=eq.${workshopId}`,
        },
        (payload: any) => {
          console.log("🔔 [BoardView] Timer update från facilitator");
          const newData = payload.new;
          
          if (newData.timer_running && newData.timer_started_at && board) {
            const startTime = new Date(newData.timer_started_at).getTime();
            const now = Date.now();
            const elapsedSeconds = Math.floor((now - startTime) / 1000);
            const totalSeconds = board.timeLimit * 60;
            const remaining = Math.max(0, totalSeconds - elapsedSeconds);
            setTimeRemaining(remaining);
          } else if (newData.time_remaining !== null) {
            setTimeRemaining(newData.time_remaining);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workshopId, board]);

  // Lokal countdown när timer körs
  useEffect(() => {
    const checkTimerRunning = async () => {
      if (!workshopId) return false;
      
      const { data } = await supabase
        .from('workshops')
        .select('timer_running')
        .eq('id', workshopId)
        .single();
      
      return data?.timer_running || false;
    };

    const interval = setInterval(async () => {
      const isRunning = await checkTimerRunning();
      
      if (isRunning && timeRemaining > 0) {
        setTimeRemaining((prev) => {
          if (prev <= 0) {
            toast({
              title: "Tiden är ute!",
              description: "Boardens tidsgräns har nåtts",
              variant: "destructive",
            });
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [workshopId, timeRemaining, toast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAddNote = async (questionId: string, content: string) => {
    if (!participantId || !participantName) return;

    try {
      console.log("📝 [Participant] Skapar note via edge function för fråga:", questionId);

      // Use edge function for secure note creation
      const { data, error } = await supabase.functions.invoke('create-note', {
        body: {
          questionId,
          content,
          participantId,
          participantName,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to create note');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to create note');
      }

      console.log("✅ [Participant] Note sparad via edge function:", data.note.id);
      
      toast({
        title: "Note skapad!",
        description: "Din idé har lagts till",
      });
    } catch (error: any) {
      console.error("Kunde inte spara note:", error);
      toast({
        title: "Fel",
        description: error.message || "Kunde inte spara note. Försök igen.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    // Participants can only delete their own notes - this is validated by checking authorId
    const note = notes.find(n => n.id === noteId);
    if (!note || note.authorId !== participantId) {
      toast({
        title: "Fel",
        description: "Du kan bara ta bort dina egna notes",
        variant: "destructive",
      });
      return;
    }

    try {
      // For now, participants cannot delete notes - only facilitator can
      // This would need a separate edge function if we want to allow it
      toast({
        title: "Info",
        description: "Kontakta facilitator för att ta bort notes",
      });
    } catch (error) {
      console.error("Fel vid borttagning:", error);
    }
  };

  const getNotesForQuestion = (questionId: string) => {
    return notes.filter((n) => n.questionId === questionId);
  };

  if (!board) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Laddar board...</p>
        </div>
      </div>
    );
  }

  const boardColor = `hsl(var(--board-${(board.colorIndex % 5) + 1}))`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div 
        className="sticky top-0 z-10 border-b shadow-sm bg-background"
        style={{ 
          borderTopColor: boardColor,
          borderTopWidth: '4px'
        }}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/join')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              <div>
                <h1 className="text-2xl font-semibold tracking-tight" style={{ color: boardColor }}>
                  {board.title}
                </h1>
                <p className="text-sm text-muted-foreground">{workshopTitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Participant Info */}
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span>{participantName}</span>
              </div>

              {/* Participant Count */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{participantCount}</span>
              </div>

              {/* Timer */}
              <div 
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold"
                style={{ 
                  backgroundColor: `${boardColor}20`,
                  color: boardColor
                }}
              >
                <Clock className="w-5 h-5" />
                {formatTime(timeRemaining)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Questions Grid */}
      <div className="container mx-auto px-4 py-6">
        <div className={`grid gap-6 ${
          board.questions.length === 1 
            ? 'grid-cols-1' 
            : board.questions.length === 2 
            ? 'grid-cols-1 md:grid-cols-2' 
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}>
          {board.questions.map((question) => {
            const questionNotes = getNotesForQuestion(question.id);
            
            return (
              <Card key={question.id} className="p-4 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: boardColor }}>
                    {question.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {questionNotes.length} {t('board.notes')}
                  </p>
                </div>

                <div className="space-y-3 min-h-[200px]">
                  {questionNotes.length === 0 ? (
                    <div className="flex items-center justify-center h-40 border-2 border-dashed border-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">{t('board.noNotesYet')}</p>
                    </div>
                  ) : (
                    questionNotes.map((note) => (
                      <StickyNote 
                        key={note.id} 
                        {...note} 
                        isOwn={note.authorId === participantId}
                        canDelete={note.authorId === participantId}
                        onDelete={() => handleDeleteNote(note.id)}
                      />
                    ))
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Floating Add Button */}
      <Button
        onClick={() => setShowAddDialog(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg"
        style={{ backgroundColor: boardColor }}
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* Add Note Dialog */}
      <AddNoteDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        questions={board.questions}
        onSubmit={handleAddNote}
      />
    </div>
  );
};

export default BoardView;

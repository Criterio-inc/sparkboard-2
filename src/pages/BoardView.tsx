import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [board, setBoard] = useState<Board | null>(null);
  const [workshopTitle, setWorkshopTitle] = useState("");
  const [workshopCode, setWorkshopCode] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [participantName, setParticipantName] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [participantCount, setParticipantCount] = useState(1);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStartedAt, setTimerStartedAt] = useState<string | null>(null);

  // Load workshop data via edge function (bypasses RLS)
  useEffect(() => {
    const loadWorkshopData = async () => {
      // Load participant session
      const sessionData = sessionStorage.getItem('participantSession');
      if (!sessionData) {
        toast({
          title: t('board.sessionMissing'),
          description: t('board.sessionMissingDesc'),
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
        console.log("📡 [Participant] Fetching data via edge function");
        
        const { data, error } = await supabase.functions.invoke('participant-data', {
          body: {
            operation: 'get-initial-data',
            workshopId,
            boardId,
            participantId: session.participantId,
          },
        });

        if (error || !data?.success) {
          console.error("Edge function error:", error || data?.error);
          toast({
            title: t('board.workshopNotFound'),
            description: t('board.workshopNotFoundDesc'),
            variant: "destructive",
          });
          navigate('/join');
          return;
        }

        console.log("✅ [Participant] Data loaded via edge function");

        setWorkshopTitle(data.workshop.name);
        setWorkshopCode(data.workshop.code);
        setParticipantCount(data.participantCount);
        
        // Set timer state
        setTimerRunning(data.workshop.timerRunning || false);
        setTimerStartedAt(data.workshop.timerStartedAt);
        
        // Calculate time remaining
        if (data.workshop.timerRunning && data.workshop.timerStartedAt) {
          const startTime = new Date(data.workshop.timerStartedAt).getTime();
          const now = Date.now();
          const elapsedSeconds = Math.floor((now - startTime) / 1000);
          const totalSeconds = data.board.timeLimit * 60;
          setTimeRemaining(Math.max(0, totalSeconds - elapsedSeconds));
        } else if (data.workshop.timeRemaining !== null) {
          setTimeRemaining(data.workshop.timeRemaining);
        } else {
          setTimeRemaining(data.board.timeLimit * 60);
        }

        const currentBoard: Board = {
          id: data.board.id,
          title: data.board.title,
          timeLimit: data.board.timeLimit,
          colorIndex: data.board.colorIndex,
          questions: data.questions.map((q: any) => ({
            id: q.id,
            title: q.title,
          })),
        };

        setBoard(currentBoard);
        
        // Format and set notes
        const formattedNotes: Note[] = data.notes.map((note: any) => ({
          id: note.id,
          questionId: note.questionId,
          content: note.content,
          authorName: note.authorName,
          authorId: note.authorId,
          timestamp: new Date(note.timestamp).toLocaleTimeString("sv-SE", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          colorIndex: note.colorIndex,
        }));
        setNotes(formattedNotes);
        
        console.log("📝 [Participant] Board and notes loaded:", {
          boardId: currentBoard.id,
          questionsCount: currentBoard.questions.length,
          notesCount: formattedNotes.length,
        });
      } catch (error) {
        console.error("Fel vid laddning av workshop-data:", error);
        toast({
          title: t('board.error'),
          description: t('board.loadError'),
          variant: "destructive",
        });
        navigate('/join');
      }
    };

    loadWorkshopData();
  }, [workshopId, boardId, navigate, toast, t]);

  // Poll for updates (replaces Supabase Realtime which is blocked by RLS)
  useEffect(() => {
    if (!workshopId || !boardId || !participantId || !board) return;

    const pollForUpdates = async () => {
      try {
        // Check for board changes and timer updates
        const { data: statusData } = await supabase.functions.invoke('participant-data', {
          body: {
            operation: 'get-workshop-status',
            workshopId,
            participantId,
          },
        });

        if (statusData?.success) {
          // Check if active board changed
          if (statusData.activeBoardId && statusData.activeBoardId !== boardId) {
            console.log("🔔 [Participant] Board changed to:", statusData.activeBoardId);
            toast({
              title: "🎯 " + t('board.movedToNext'),
              description: statusData.newBoardTitle 
                ? `${t('board.newBoard')}: ${statusData.newBoardTitle}`
                : t('board.syncing'),
              duration: 5000,
            });
            navigate(`/board/${workshopId}/${statusData.activeBoardId}`);
            return;
          }

          // Update timer state
          setTimerRunning(statusData.timerRunning || false);
          setTimerStartedAt(statusData.timerStartedAt);
          
          if (statusData.timerRunning && statusData.timerStartedAt && board) {
            const startTime = new Date(statusData.timerStartedAt).getTime();
            const now = Date.now();
            const elapsedSeconds = Math.floor((now - startTime) / 1000);
            const totalSeconds = board.timeLimit * 60;
            setTimeRemaining(Math.max(0, totalSeconds - elapsedSeconds));
          } else if (statusData.timeRemaining !== null) {
            setTimeRemaining(statusData.timeRemaining);
          }
        }

        // Fetch latest notes
        const questionIds = board.questions.map(q => q.id);
        if (questionIds.length > 0) {
          const { data: notesData } = await supabase.functions.invoke('participant-data', {
            body: {
              operation: 'get-notes',
              participantId,
              questionIds,
            },
          });

          if (notesData?.success) {
            const formattedNotes: Note[] = notesData.notes.map((note: any) => ({
              id: note.id,
              questionId: note.questionId,
              content: note.content,
              authorName: note.authorName,
              authorId: note.authorId,
              timestamp: new Date(note.timestamp).toLocaleTimeString("sv-SE", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              colorIndex: note.colorIndex,
            }));
            setNotes(formattedNotes);
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    };

    // Poll every 3 seconds
    pollIntervalRef.current = setInterval(pollForUpdates, 3000);
    
    // Initial poll
    pollForUpdates();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [workshopId, boardId, participantId, board, navigate, toast, t]);

  // Local timer countdown
  useEffect(() => {
    if (!timerRunning || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          toast({
            title: t('board.timeUp'),
            description: t('board.timeLimitReached'),
            variant: "destructive",
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning, timeRemaining, toast, t]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAddNote = async (questionId: string, content: string) => {
    if (!participantId || !participantName) return;

    try {
      console.log("📝 [Participant] Skapar note via edge function för fråga:", questionId);

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
        title: t('board.noteCreated'),
        description: t('board.noteCreatedDesc'),
      });
    } catch (error: any) {
      console.error("Kunde inte spara note:", error);
      toast({
        title: t('board.error'),
        description: error.message || t('board.saveError'),
        variant: "destructive",
      });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    toast({
      title: "Info",
      description: t('board.deleteNotImplemented'),
    });
  };

  const getNotesForQuestion = (questionId: string) => {
    return notes.filter((note) => note.questionId === questionId);
  };

  if (!board) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('board.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/join')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold">{board.title}</h1>
                <p className="text-sm text-muted-foreground">{workshopTitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Participant info */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{participantName}</span>
              </div>

              {/* Participant count */}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{participantCount}</span>
              </div>

              {/* Timer */}
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                timeRemaining <= 60 ? 'bg-destructive/10 text-destructive' : 'bg-muted'
              }`}>
                <Clock className="h-4 w-4" />
                <span className="font-mono font-medium">{formatTime(timeRemaining)}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {board.questions.map((question) => (
            <Card key={question.id} className="p-4">
              <h3 className="font-medium mb-4 text-center border-b pb-2">
                {question.title}
              </h3>
              <div className="space-y-3 min-h-[200px]">
                {getNotesForQuestion(question.id).map((note) => (
                  <StickyNote
                    key={note.id}
                    id={note.id}
                    content={note.content}
                    authorName={note.authorName}
                    timestamp={note.timestamp}
                    colorIndex={note.colorIndex}
                    onDelete={() => handleDeleteNote(note.id)}
                    isOwn={note.authorId === participantId}
                  />
                ))}
              </div>
            </Card>
          ))}
        </div>
      </main>

      {/* Floating action button */}
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        onClick={() => setShowAddDialog(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Add note dialog */}
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

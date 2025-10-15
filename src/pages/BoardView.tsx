import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StickyNote } from "@/components/StickyNote";
import { AddNoteDialog } from "@/components/AddNoteDialog";
import { Plus, ArrowLeft, Clock, Users, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getWorkshopById } from "@/utils/workshopStorage";

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
  
  const [board, setBoard] = useState<Board | null>(null);
  const [workshopTitle, setWorkshopTitle] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [participantName, setParticipantName] = useState("");
  const [participantId, setParticipantId] = useState("");

  // Load workshop and participant session
  useEffect(() => {
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

    // Load workshop
    if (!workshopId) {
      navigate('/join');
      return;
    }

    const workshop = getWorkshopById(workshopId);
    if (!workshop) {
      toast({
        title: "Workshop hittades inte",
        description: "Kontrollera att workshop-koden är korrekt",
        variant: "destructive",
      });
      navigate('/join');
      return;
    }

    setWorkshopTitle(workshop.title);

    // Find the board
    const currentBoard = workshop.boards.find(b => b.id === boardId);
    if (!currentBoard) {
      toast({
        title: "Board hittades inte",
        description: "Denna övning kunde inte hittas",
        variant: "destructive",
      });
      navigate('/join');
      return;
    }

    setBoard(currentBoard);
    setTimeRemaining(currentBoard.timeLimit * 60);
  }, [workshopId, boardId, navigate, toast]);

  // Participant color mapping
  const [participantColors] = useState<Record<string, number>>({});

  useEffect(() => {
    if (participantId && !participantColors[participantId]) {
      participantColors[participantId] = Object.keys(participantColors).length % 8;
    }
  }, [participantId, participantColors]);

  // Timer countdown
  useEffect(() => {
    if (!board || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          toast({
            title: "Tiden är ute!",
            description: "Boardens tidsgräns har nåtts",
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [board, toast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAddNote = (questionId: string, content: string) => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      questionId,
      content,
      authorName: participantName,
      authorId: participantId,
      timestamp: new Date().toLocaleTimeString("sv-SE", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      colorIndex: participantColors[participantId] || 0,
    };

    setNotes([...notes, newNote]);
    
    toast({
      title: "Note skapad!",
      description: "Din idé har lagts till",
    });
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes(notes.filter((n) => n.id !== noteId));
    
    toast({
      title: "Note borttagen",
      description: "Din note har tagits bort",
    });
  };

  const getNotesForQuestion = (questionId: string) => {
    return notes.filter((n) => n.questionId === questionId);
  };

  if (!board) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Laddar...</h2>
          <p className="text-muted-foreground">Hämtar workshop-data</p>
        </div>
      </div>
    );
  }

  const boardColor = `hsl(var(--board-${(board.colorIndex % 5) + 1}))`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div 
        className="sticky top-0 z-10 border-b shadow-sm"
        style={{
          backgroundColor: "hsl(var(--background))",
          borderTopColor: boardColor,
          borderTopWidth: "4px",
        }}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              <div>
                <h1 className="text-2xl font-bold">{board.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {workshopTitle} • {board.questions.length} frågor
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="secondary" className="flex items-center gap-2 px-3 py-2">
                <User className="w-4 h-4" />
                <span className="font-medium">{participantName}</span>
              </Badge>
              <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">3 deltagare</span>
              </div>

              <div 
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold"
                style={{
                  backgroundColor: `${boardColor}20`,
                  color: boardColor,
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
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {board.questions.map((question) => {
            const questionNotes = getNotesForQuestion(question.id);
            
            return (
              <Card key={question.id} className="p-6 space-y-4">
                <div>
                  <h2 
                    className="text-lg font-semibold mb-1"
                    style={{ color: boardColor }}
                  >
                    {question.title}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {questionNotes.length} {questionNotes.length === 1 ? "note" : "notes"}
                  </p>
                </div>

                <div className="space-y-3 min-h-[200px]">
                  {questionNotes.length === 0 ? (
                    <div className="flex items-center justify-center h-40 border-2 border-dashed border-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Inga notes än
                      </p>
                    </div>
                  ) : (
                    questionNotes.map((note) => (
                      <StickyNote
                        key={note.id}
                        {...note}
                        isOwn={note.authorId === participantId}
                        onDelete={() => handleDeleteNote(note.id)}
                      />
                    ))
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Empty state */}
        {notes.length === 0 && (
          <Card className="mt-8 p-12 text-center border-dashed">
            <div className="max-w-md mx-auto">
              <div 
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: `${boardColor}20` }}
              >
                <Plus className="w-8 h-8" style={{ color: boardColor }} />
              </div>
              <h3 className="text-lg font-semibold mb-2">Sätt igång!</h3>
              <p className="text-muted-foreground mb-4">
                Klicka på knappen nedan för att skapa din första sticky note
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Floating Action Button */}
      <Button
        onClick={() => setShowAddDialog(true)}
        className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-[var(--shadow-glow)] hover:shadow-[var(--shadow-accent)] transition-all duration-300 hover:scale-110"
        size="icon"
        variant="hero"
      >
        <Plus className="w-8 h-8" />
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

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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { saveWorkshop, getWorkshopById } from "@/utils/workshopStorage";

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
  const { id } = useParams();
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [workshopId, setWorkshopId] = useState<string | undefined>(id);

  const [workshop, setWorkshop] = useState<Workshop>({
    title: "",
    description: "",
    boards: [],
    status: "draft",
  });

  useEffect(() => {
    if (workshopId) {
      const existingWorkshop = getWorkshopById(workshopId);
      if (existingWorkshop) {
        setWorkshop({
          title: existingWorkshop.title,
          description: existingWorkshop.description,
          boards: existingWorkshop.boards,
          code: existingWorkshop.code,
          status: existingWorkshop.status,
        });
        if (existingWorkshop.code) {
          setGeneratedCode(existingWorkshop.code);
        }
      }
    }
  }, [workshopId]);

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

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

  const validateWorkshop = (): boolean => {
    if (!workshop.title.trim()) {
      toast({
        title: "Titel saknas",
        description: "Vänligen ange ett namn för workshopen",
        variant: "destructive",
      });
      return false;
    }

    if (workshop.boards.length === 0) {
      toast({
        title: "Inga boards",
        description: "Lägg till minst ett board till workshopen",
        variant: "destructive",
      });
      return false;
    }

    for (const board of workshop.boards) {
      if (!board.title.trim()) {
        toast({
          title: "Board-titel saknas",
          description: "Alla boards måste ha en titel",
          variant: "destructive",
        });
        return false;
      }

      if (board.questions.length === 0) {
        toast({
          title: "Inga frågor",
          description: `Board "${board.title}" måste ha minst en fråga`,
          variant: "destructive",
        });
        return false;
      }

      for (const question of board.questions) {
        if (!question.title.trim()) {
          toast({
            title: "Fråga saknas",
            description: `Alla frågor i "${board.title}" måste ha en titel`,
            variant: "destructive",
          });
          return false;
        }
      }
    }

    return true;
  };

  const handleSaveDraft = () => {
    if (!validateWorkshop()) return;

    const saved = saveWorkshop({
      id: workshopId,
      title: workshop.title,
      description: workshop.description,
      boards: workshop.boards,
      code: workshop.code,
      status: "draft",
    });

    setWorkshopId(saved.id);

    toast({
      title: "Draft sparad!",
      description: "Din workshop har sparats som draft",
    });

    setTimeout(() => {
      navigate("/dashboard");
    }, 1500);
  };

  const handleActivate = () => {
    if (!validateWorkshop()) return;

    const code = generatedCode || generateCode();
    setGeneratedCode(code);

    const saved = saveWorkshop({
      id: workshopId,
      title: workshop.title,
      description: workshop.description,
      boards: workshop.boards,
      code: code,
      status: "active",
    });

    setWorkshopId(saved.id);
    setShowQRDialog(true);

    toast({
      title: "Workshop aktiverad!",
      description: `Din workshop-kod är: ${code}`,
    });
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
                <BoardCard
                  key={board.id}
                  board={board}
                  index={index}
                  onUpdate={(updated) => updateBoard(board.id, updated)}
                  onDelete={() => deleteBoard(board.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-4">
              <Button
                onClick={handleSaveDraft}
                variant="outline"
                size="lg"
                className="w-full"
              >
                <Save className="w-5 h-5 mr-2" />
                Spara som Draft
              </Button>

              <Button
                onClick={handleActivate}
                variant="hero"
                size="lg"
                className="w-full"
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
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Workshop Aktiverad!</DialogTitle>
            <DialogDescription>
              Dela denna kod eller QR-kod med dina deltagare
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-block p-4 bg-white rounded-lg">
                <QRCodeSVG id="qr-code-svg" value={getJoinUrl()} size={200} />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadQRCode}
                className="mt-2"
              >
                Ladda ner QR-kod
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Workshop-kod</p>
              <p className="text-4xl font-bold font-mono tracking-wider text-primary">
                {generatedCode}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Deltagarlänk</Label>
              <div className="flex gap-2">
                <Input value={getJoinUrl()} readOnly className="font-mono text-sm" />
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(getJoinUrl());
                    toast({
                      title: "Kopierad!",
                      description: "Länken har kopierats",
                    });
                  }}
                >
                  Kopiera
                </Button>
              </div>
            </div>

            <Button
              onClick={() => {
                setShowQRDialog(false);
                navigate("/dashboard");
              }}
              className="w-full"
              variant="default"
            >
              Gå till Dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateWorkshop;

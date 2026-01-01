import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, QrCode, UserPlus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";

const JoinWorkshop = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [workshopCode, setWorkshopCode] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const codeFromUrl = searchParams.get("code");
    if (codeFromUrl) {
      setWorkshopCode(codeFromUrl.toUpperCase());
    }
  }, [searchParams]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (value.length <= 6) {
      setWorkshopCode(value);
    }
  };

  const startQRScanner = async () => {
    setShowScanner(true);
    setIsScanning(true);

    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          // Extract code from URL or use directly
          let code = "";
          try {
            const url = new URL(decodedText);
            code = url.searchParams.get("code") || "";
          } catch {
            // If not a URL, assume it's the code directly
            code = decodedText;
          }

          if (code && code.length === 6) {
            setWorkshopCode(code.toUpperCase());
            stopQRScanner();
            toast({
              title: "QR-kod scannad!",
              description: `Workshop-kod: ${code.toUpperCase()}`,
            });
          }
        },
        (errorMessage) => {
          // Ignore scanning errors (happens frequently)
          console.debug("QR scanning:", errorMessage);
        }
      );
    } catch (err) {
      console.error("Error starting QR scanner:", err);
      toast({
        title: "Kan inte starta kamera",
        description: "Kontrollera att din webbläsare har tillgång till kameran",
        variant: "destructive",
      });
      setShowScanner(false);
      setIsScanning(false);
    }
  };

  const stopQRScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping QR scanner:", err);
      }
    }
    setShowScanner(false);
    setIsScanning(false);
    scannerRef.current = null;
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [isScanning]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Normalisera och validera kod
    const enteredCode = workshopCode.trim().toUpperCase();
    
    if (enteredCode.length !== 6) {
      toast({
        title: "Ogiltig kod",
        description: "Workshop-koden måste vara 6 tecken lång",
        variant: "destructive",
      });
      return;
    }

    if (!participantName.trim() || participantName.trim().length < 2) {
      toast({
        title: "Namn saknas",
        description: "Vänligen ange ett namn (minst 2 tecken)",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    console.log("🔍 === ANSLUTER TILL WORKSHOP (VIA EDGE FUNCTION) ===");
    console.log("🔑 Angiven kod:", enteredCode);

    try {
      // Use edge function for secure join
      const { data, error } = await supabase.functions.invoke('join-workshop', {
        body: {
          workshopCode: enteredCode,
          participantName: participantName.trim(),
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to join workshop');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to join workshop');
      }

      console.log("✅ Deltagare ansluten via edge function:", data.participant.name);

      // Spara session-data lokalt (endast för denna enhet)
      const participantSession = {
        workshopId: data.workshop.id,
        workshopCode: data.workshop.code,
        participantName: data.participant.name,
        participantId: data.participant.id,
        joinedAt: data.participant.joinedAt,
      };

      sessionStorage.setItem('participantSession', JSON.stringify(participantSession));

      toast({
        title: "Välkommen!",
        description: `Du har anslutit till "${data.workshop.name}"`,
      });

      // Navigate to first board
      navigate(`/board/${data.workshop.id}/${data.firstBoardId}`);
    } catch (error: any) {
      setIsLoading(false);
      console.error("❌ Fel vid anslutning:", error);
      
      let errorMessage = "Något gick fel. Försök igen.";
      if (error.message?.includes('not found')) {
        errorMessage = "Workshop-koden hittades inte. Kontrollera att koden är korrekt.";
      } else if (error.message?.includes('not active')) {
        errorMessage = "Denna workshop är inte aktiv just nu.";
      } else if (error.message?.includes('limit')) {
        errorMessage = "Workshopen har nått max antal deltagare.";
      }
      
      toast({
        title: "Kunde inte ansluta",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link to="/">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tillbaka
          </Button>
        </Link>

        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-accent/10 px-4 py-2 rounded-full mb-4">
              <UserPlus className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">Gå med</span>
            </div>
            
            <h1 className="text-4xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent mb-2">
              Gå med i Workshop
            </h1>
            <p className="text-muted-foreground">
              Ange din 6-siffriga workshop-kod och ditt namn
            </p>
          </div>

          <Card className="shadow-[var(--shadow-accent)] bg-gradient-to-br from-card to-accent/5">
            <CardHeader>
              <CardTitle>Anslut till Workshop</CardTitle>
              <CardDescription>
                Få workshop-koden från din facilitator
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="code">Workshop-kod *</Label>
                  <Input
                    id="code"
                    placeholder="ABC123"
                    value={workshopCode}
                    onChange={handleCodeChange}
                    className="h-14 text-center text-2xl font-mono tracking-widest"
                    maxLength={6}
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    {workshopCode.length}/6 tecken
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Ditt namn *</Label>
                  <Input
                    id="name"
                    placeholder="Ange ditt namn"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    className="h-12"
                  />
                </div>

                <div className="pt-4 space-y-3">
                  <Button 
                    type="submit" 
                    variant="accent" 
                    size="xl" 
                    className="w-full"
                    disabled={workshopCode.length !== 6 || !participantName.trim() || isLoading}
                  >
                    <UserPlus className="w-5 h-5 mr-2" />
                    {isLoading ? "Ansluter..." : "Gå med i Workshop"}
                  </Button>
                  
                  <Link to="/" className="block">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="lg" 
                      className="w-full"
                    >
                      Avbryt
                    </Button>
                  </Link>
                </div>
              </form>

              <div className="mt-6 pt-6 border-t border-border">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  size="lg"
                  onClick={startQRScanner}
                >
                  <QrCode className="w-5 h-5 mr-2" />
                  Scanna QR-kod
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 p-6 bg-muted/50 rounded-lg border border-border">
            <h3 className="font-semibold mb-2">ℹ️ Information</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Koden består av 6 bokstäver och siffror</li>
              <li>• Du behöver inte skapa ett konto för att delta</li>
              <li>• Ditt namn kommer att visas för andra deltagare</li>
            </ul>
          </div>
        </div>
      </div>

      {/* QR Scanner Dialog */}
      <Dialog open={showScanner} onOpenChange={(open) => {
        if (!open) stopQRScanner();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scanna QR-kod</DialogTitle>
            <DialogDescription>
              Rikta kameran mot QR-koden för att automatiskt fylla i workshop-koden
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <div id="qr-reader" className="w-full rounded-lg overflow-hidden"></div>
            
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-background/80 hover:bg-background"
              onClick={stopQRScanner}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Se till att QR-koden är inom den gröna ramen
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JoinWorkshop;

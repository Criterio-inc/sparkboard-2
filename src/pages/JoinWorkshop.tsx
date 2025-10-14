import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, QrCode, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const JoinWorkshop = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [workshopCode, setWorkshopCode] = useState("");
  const [participantName, setParticipantName] = useState("");

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (workshopCode.length !== 6) {
      toast({
        title: "Ogiltig kod",
        description: "Workshop-koden måste vara 6 tecken lång",
        variant: "destructive",
      });
      return;
    }

    if (!participantName.trim()) {
      toast({
        title: "Namn saknas",
        description: "Vänligen ange ditt namn",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Ansluter till workshop...",
      description: `Välkommen ${participantName}!`,
    });

    // In a real app, this would validate the code and join the workshop
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
                    disabled={workshopCode.length !== 6 || !participantName.trim()}
                  >
                    <UserPlus className="w-5 h-5 mr-2" />
                    Gå med i Workshop
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
                  disabled
                >
                  <QrCode className="w-5 h-5 mr-2" />
                  Scanna QR-kod (Kommer snart)
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
    </div>
  );
};

export default JoinWorkshop;

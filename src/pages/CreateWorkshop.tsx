import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CreateWorkshop = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [workshopName, setWorkshopName] = useState("");
  const [description, setDescription] = useState("");

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workshopName.trim()) {
      toast({
        title: "Namn saknas",
        description: "Vänligen ange ett namn för workshopen",
        variant: "destructive",
      });
      return;
    }

    const code = generateCode();
    
    toast({
      title: "Workshop skapad!",
      description: `Din workshop-kod är: ${code}`,
    });

    // In a real app, this would save to database
    setTimeout(() => {
      navigate("/dashboard");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tillbaka till Dashboard
          </Button>
        </Link>

        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Ny Workshop</span>
            </div>
            
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
              Skapa Workshop
            </h1>
            <p className="text-muted-foreground">
              Fyll i informationen för din nya workshop
            </p>
          </div>

          <Card className="shadow-[var(--shadow-glow)] bg-gradient-to-br from-card to-muted/20">
            <CardHeader>
              <CardTitle>Workshop Information</CardTitle>
              <CardDescription>
                En unik 6-siffrig kod kommer att genereras automatiskt
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Workshop Namn *</Label>
                  <Input
                    id="name"
                    placeholder="T.ex. Strategi Workshop 2024"
                    value={workshopName}
                    onChange={(e) => setWorkshopName(e.target.value)}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Beskrivning (valfritt)</Label>
                  <Input
                    id="description"
                    placeholder="Kort beskrivning av workshopen"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-12"
                  />
                </div>

                <div className="pt-4 space-y-3">
                  <Button 
                    type="submit" 
                    variant="hero" 
                    size="xl" 
                    className="w-full"
                  >
                    Skapa Workshop
                  </Button>
                  
                  <Link to="/dashboard" className="block">
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
            </CardContent>
          </Card>

          <div className="mt-8 p-6 bg-muted/50 rounded-lg border border-border">
            <h3 className="font-semibold mb-2">💡 Tips</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Välj ett beskrivande namn som deltagarna känner igen</li>
              <li>• Koden kommer att visas på skärmen efter skapandet</li>
              <li>• Dela koden med dina deltagare för att de ska kunna gå med</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateWorkshop;

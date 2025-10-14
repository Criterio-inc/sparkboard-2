import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar, Users, ArrowLeft, MoreVertical, Edit, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Workshop {
  id: string;
  name: string;
  code: string;
  date: string;
  participants: number;
}

const WorkshopDashboard = () => {
  const [workshops, setWorkshops] = useState<Workshop[]>([
    {
      id: "1",
      name: "Strategi Workshop 2024",
      code: "ABC123",
      date: "2024-03-15",
      participants: 12
    },
    {
      id: "2",
      name: "Team Building Session",
      code: "XYZ789",
      date: "2024-03-10",
      participants: 8
    }
  ]);

  const handleDelete = (id: string) => {
    setWorkshops(workshops.filter(w => w.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka
            </Button>
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                Mina Workshops
              </h1>
              <p className="text-muted-foreground">
                Hantera och skapa nya workshops
              </p>
            </div>
            
            <Link to="/create-workshop">
              <Button variant="hero" size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Skapa Ny Workshop
              </Button>
            </Link>
          </div>
        </div>

        {/* Workshop Grid */}
        {workshops.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Inga workshops än</h3>
              <p className="text-muted-foreground mb-6">
                Kom igång genom att skapa din första workshop
              </p>
              <Link to="/create-workshop">
                <Button variant="hero">
                  <Plus className="w-5 h-5 mr-2" />
                  Skapa Workshop
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workshops.map((workshop) => (
              <Card 
                key={workshop.id}
                className="hover:shadow-[var(--shadow-glow)] transition-all duration-300 hover:scale-105 bg-gradient-to-br from-card to-muted/20"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{workshop.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <span className="font-mono text-lg font-semibold text-primary">
                          {workshop.code}
                        </span>
                      </CardDescription>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Redigera
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDelete(workshop.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Ta bort
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(workshop.date).toLocaleDateString('sv-SE')}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{workshop.participants} deltagare</span>
                    </div>
                    
                    <Link to={`/facilitator/${workshop.id}`} className="w-full">
                      <Button className="w-full mt-4" variant="default">
                        Öppna Workshop
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkshopDashboard;

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Users, Clock, User, Trash2 } from "lucide-react";

interface Participant {
  id: string;
  name: string;
  joinedAt: string;
  colorIndex: number;
}

interface ParticipantListProps {
  participants: Participant[];
  onDeleteParticipant?: (participantId: string) => void;
}

const participantColors = [
  "bg-yellow-200",
  "bg-pink-200",
  "bg-blue-200",
  "bg-green-200",
  "bg-purple-200",
  "bg-orange-200",
];

export const ParticipantList = ({ participants, onDeleteParticipant }: ParticipantListProps) => {
  const useGridLayout = participants.length > 10;
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="w-4 h-4" />
          Deltagare ({participants.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`${useGridLayout ? 'grid grid-cols-2 gap-2' : 'space-y-2'}`}>
          {participants.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground col-span-2">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Inga deltagare än</p>
            </div>
          ) : (
            participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    participantColors[participant.colorIndex % participantColors.length]
                  }`}
                >
                  <User className="w-4 h-4 text-gray-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{participant.name}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{participant.joinedAt}</span>
                  </div>
                </div>
                
                {onDeleteParticipant && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 flex-shrink-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Ta bort deltagare?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Är du säker på att du vill ta bort {participant.name} från workshopen? Detta kan inte ångras.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Avbryt</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDeleteParticipant(participant.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Ta bort
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

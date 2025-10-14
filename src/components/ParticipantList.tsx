import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, User } from "lucide-react";

interface Participant {
  id: string;
  name: string;
  joinedAt: string;
  colorIndex: number;
}

interface ParticipantListProps {
  participants: Participant[];
}

const participantColors = [
  "bg-yellow-200",
  "bg-pink-200",
  "bg-blue-200",
  "bg-green-200",
  "bg-purple-200",
  "bg-orange-200",
];

export const ParticipantList = ({ participants }: ParticipantListProps) => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5" />
          Deltagare ({participants.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {participants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Inga deltagare än</p>
            </div>
          ) : (
            participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    participantColors[participant.colorIndex % participantColors.length]
                  }`}
                >
                  <User className="w-5 h-5 text-gray-700" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{participant.name}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{participant.joinedAt}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

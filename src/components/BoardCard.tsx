import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, GripVertical } from "lucide-react";

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

interface BoardCardProps {
  board: Board;
  index: number;
  onUpdate: (board: Board) => void;
  onDelete: () => void;
  isDraggable?: boolean;
}

const boardColors = [
  "hsl(var(--board-1))",
  "hsl(var(--board-2))",
  "hsl(var(--board-3))",
  "hsl(var(--board-4))",
  "hsl(var(--board-5))",
];

export const BoardCard = ({ board, index, onUpdate, onDelete, isDraggable = true }: BoardCardProps) => {
  const boardColor = boardColors[board.colorIndex % boardColors.length];

  const addQuestion = () => {
    if (board.questions.length >= 5) return;
    
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      title: "",
    };
    
    onUpdate({
      ...board,
      questions: [...board.questions, newQuestion],
    });
  };

  const updateQuestion = (questionId: string, title: string) => {
    onUpdate({
      ...board,
      questions: board.questions.map((q) =>
        q.id === questionId ? { ...q, title } : q
      ),
    });
  };

  const deleteQuestion = (questionId: string) => {
    onUpdate({
      ...board,
      questions: board.questions.filter((q) => q.id !== questionId),
    });
  };

  return (
    <Card 
      className="relative overflow-hidden transition-all duration-300 hover:shadow-lg"
      style={{
        borderTop: `4px solid ${boardColor}`,
      }}
    >
      <CardHeader>
        <div className="flex items-start gap-3">
          <div 
            className={`mt-1 ${isDraggable ? 'cursor-grab' : 'cursor-not-allowed opacity-50'}`}
            style={{ color: boardColor }}
          >
            <GripVertical className="w-5 h-5" />
          </div>
          
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div 
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: `${boardColor}20`,
                  color: boardColor,
                }}
              >
                Board {index + 1}
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Board-titel</Label>
              <Input
                value={board.title}
                onChange={(e) => onUpdate({ ...board, title: e.target.value })}
                placeholder="T.ex. Brev från framtiden"
                className="text-lg font-semibold"
              />
            </div>

            <div className="space-y-2">
              <Label>Tidsgräns (minuter)</Label>
              <Input
                type="number"
                min="1"
                max="120"
                value={board.timeLimit}
                onChange={(e) => onUpdate({ ...board, timeLimit: parseInt(e.target.value) || 0 })}
                placeholder="15"
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Frågor ({board.questions.length}/5)</Label>
          
          {board.questions.map((question, qIndex) => (
            <div key={question.id} className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={question.title}
                  onChange={(e) => updateQuestion(question.id, e.target.value)}
                  placeholder={`Fråga ${qIndex + 1}`}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteQuestion(question.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {board.questions.length < 5 && (
          <Button
            variant="outline"
            onClick={addQuestion}
            className="w-full"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Lägg till fråga
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: { id: string; title: string }[];
  onSubmit: (questionId: string, content: string) => void;
}

export const AddNoteDialog = ({
  open,
  onOpenChange,
  questions,
  onSubmit,
}: AddNoteDialogProps) => {
  const [selectedQuestion, setSelectedQuestion] = useState<string>("");
  const [content, setContent] = useState("");

  const handleSubmit = () => {
    if (!selectedQuestion || !content.trim()) return;

    onSubmit(selectedQuestion, content);
    setContent("");
    setSelectedQuestion("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Skapa Sticky Note</DialogTitle>
          <DialogDescription>
            Skriv din idé och välj vilken fråga den hör till
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">Välj fråga</Label>
            <Select value={selectedQuestion} onValueChange={setSelectedQuestion}>
              <SelectTrigger id="question">
                <SelectValue placeholder="Välj en fråga..." />
              </SelectTrigger>
              <SelectContent>
                {questions.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Din idé</Label>
            <Textarea
              id="content"
              placeholder="Skriv din idé här..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {content.length} / 500 tecken
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={!selectedQuestion || !content.trim()}
              className="flex-1"
              variant="hero"
            >
              Lägg till Note
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1"
            >
              Avbryt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

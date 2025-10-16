import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
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
  const { t } = useLanguage();
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
          <DialogTitle>{t('addNote.title')}</DialogTitle>
          <DialogDescription>
            {t('addNote.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">{t('addNote.selectQuestion')}</Label>
            <Select value={selectedQuestion} onValueChange={setSelectedQuestion}>
              <SelectTrigger id="question">
                <SelectValue placeholder={t('addNote.selectPlaceholder')} />
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
            <Label htmlFor="content">{t('addNote.noteContent')}</Label>
            <Textarea
              id="content"
              placeholder={t('addNote.notePlaceholder')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {content.length} / 500
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={!selectedQuestion || !content.trim()}
              className="flex-1"
              variant="hero"
            >
              {t('addNote.submit')}
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1"
            >
              {t('addNote.cancel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

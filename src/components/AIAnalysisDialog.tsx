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
import { ScrollArea } from "@/components/ui/scroll-area";
import { StickyNote } from "@/components/StickyNote";
import { Loader2, Copy, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";

interface Note {
  id: string;
  questionId: string;
  content: string;
  authorName: string;
  authorId: string;
  timestamp: string;
  colorIndex: number;
  question?: string;
}

interface AIAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: Note[];
  boardTitle: string;
  onAnalysisComplete?: (analysis: string) => void;
}

const DEFAULT_PROMPT =
  "Sammanfatta huvudteman och insights från dessa workshop-svar. Gruppera liknande idéer och ge rekommendationer för nästa steg.";

export const AIAnalysisDialog = ({
  open,
  onOpenChange,
  notes,
  boardTitle,
  onAnalysisComplete,
}: AIAnalysisDialogProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [customPrompt, setCustomPrompt] = useState(DEFAULT_PROMPT);
  const [analysis, setAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysis("");

    try {
      const { data, error } = await supabase.functions.invoke("analyze-notes", {
        body: {
          notes: notes.map((note) => ({
            content: note.content,
            authorName: note.authorName,
            question: note.question || "Question",
          })),
          customPrompt,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: t('aiAnalysisDialog.analysisError'),
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setAnalysis(data.analysis);
      
      // Notify parent component about the analysis
      if (onAnalysisComplete) {
        onAnalysisComplete(data.analysis);
      }
      
      toast({
        title: t('aiAnalysisDialog.analysisComplete'),
        description: t('aiAnalysisDialog.analysisCompleteDesc'),
      });
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: t('aiAnalysisDialog.generalError'),
        description: t('aiAnalysisDialog.generalErrorDesc'),
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(analysis);
      setCopied(true);
      toast({
        title: t('aiAnalysisDialog.copySuccess'),
        description: t('aiAnalysisDialog.copySuccessDesc'),
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: t('aiAnalysisDialog.copyError'),
        description: t('aiAnalysisDialog.copyErrorDesc'),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>{t('aiAnalysisDialog.title', { boardTitle })}</DialogTitle>
          <DialogDescription>
            {t('aiAnalysisDialog.description', { count: notes.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 h-full overflow-hidden">
          {/* Left: Notes Context */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold mb-2 block">
                {t('aiAnalysisDialog.notesLabel', { count: notes.length })}
              </Label>
              <ScrollArea className="h-[300px] rounded-lg border p-4 bg-muted/20">
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div key={note.id} className="text-xs">
                      <StickyNote {...note} isOwn={false} />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">{t('aiAnalysisDialog.customPrompt')}</Label>
              <Textarea
                id="prompt"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={4}
                placeholder={t('aiAnalysisDialog.promptPlaceholder')}
                className="resize-none"
              />
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || notes.length === 0}
              className="w-full"
              variant="hero"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {t('aiAnalysisDialog.analyzing')}
                </>
              ) : (
                t('aiAnalysisDialog.analyzeButton')
              )}
            </Button>
          </div>

          {/* Right: AI Analysis */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">{t('aiAnalysisDialog.aiAnalysisLabel')}</Label>
              {analysis && (
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  size="sm"
                  disabled={copied}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {t('aiAnalysisDialog.copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      {t('aiAnalysisDialog.copy')}
                    </>
                  )}
                </Button>
              )}
            </div>

            <ScrollArea className="h-[500px] rounded-lg border p-6 bg-muted/20">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Loader2 className="w-12 h-12 animate-spin mb-4" />
                  <p>{t('aiAnalysisDialog.analyzingStatus')}</p>
                  <p className="text-sm mt-2">{t('aiAnalysisDialog.analyzingWait')}</p>
                </div>
              ) : analysis ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{analysis}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <p>{t('aiAnalysisDialog.clickToStart')}</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

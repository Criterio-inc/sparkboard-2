import { useState, useEffect } from "react";
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
import { Loader2, Copy, CheckCircle2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";

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
  boardId: string;
  boardTitle: string;
  onAnalysisComplete?: (analysis: string) => void;
}

interface SavedAnalysis {
  id: string;
  analysis: string;
  created_at: string;
  board_id: string;
}

export const AIAnalysisDialog = ({
  open,
  onOpenChange,
  notes,
  boardId,
  boardTitle,
  onAnalysisComplete,
}: AIAnalysisDialogProps) => {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [customPrompt, setCustomPrompt] = useState("");
  const [hasCustomPrompt, setHasCustomPrompt] = useState(false);
  const [analysis, setAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previousAnalyses, setPreviousAnalyses] = useState<SavedAnalysis[]>([]);
  const [loadingPrevious, setLoadingPrevious] = useState(false);

  // Load prompt from previous analysis or use default
  useEffect(() => {
    const loadPrompt = async () => {
      if (!open || !boardId) return;

      // Try to get the latest analysis for this board to retrieve custom prompt
      const { data: latestAnalysis } = await supabase
        .from('ai_analyses')
        .select('*')
        .eq('board_id', boardId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestAnalysis?.analysis) {
        // Check if there's a custom prompt stored (we'll need to infer from analysis or store separately)
        // For now, we'll use the default prompt from translations
        const defaultPrompt = t('ai.defaultPrompt');
        setCustomPrompt(defaultPrompt);
        setHasCustomPrompt(false);
      } else {
        const defaultPrompt = t('ai.defaultPrompt');
        setCustomPrompt(defaultPrompt);
        setHasCustomPrompt(false);
      }
    };

    loadPrompt();
  }, [open, boardId, t]);

  // Load previous analyses when board changes and RESET current analysis
  useEffect(() => {
    if (open && boardId) {
      // CRITICAL: Reset analysis when switching boards
      setAnalysis("");
      loadPreviousAnalyses();
    }
  }, [open, boardId]);

  const loadPreviousAnalyses = async () => {
    setLoadingPrevious(true);
    try {
      const { data, error } = await supabase
        .from('ai_analyses')
        .select('*')
        .eq('board_id', boardId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPreviousAnalyses(data || []);

      // If there's a latest analysis, check if we should use its prompt
      if (data && data.length > 0 && data[0].analysis) {
        // We'll use the default prompt for now since we don't store custom_prompt separately yet
        // This will be enhanced when we add custom_prompt column to the database
        const defaultPrompt = t('ai.defaultPrompt');
        setCustomPrompt(defaultPrompt);
        setHasCustomPrompt(false);
      }
    } catch (error) {
      console.error('Error loading previous analyses:', error);
    } finally {
      setLoadingPrevious(false);
    }
  };

  const resetToDefaultPrompt = () => {
    setCustomPrompt(t('ai.defaultPrompt'));
    setHasCustomPrompt(false);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysis("");

    try {
      const { data, error } = await supabase.functions.invoke("analyze-notes", {
        body: {
          notes: notes.map((note) => ({
            content: note.content,
            question: note.question || "Question",
          })),
          customPrompt,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: t('common.error'),
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setAnalysis(data.analysis);

      // Save analysis to database
      const { error: saveError } = await supabase
        .from('ai_analyses')
        .insert({
          board_id: boardId,
          analysis: data.analysis,
        });

      if (saveError) {
        console.error('Error saving analysis:', saveError);
      } else {
        // Reload previous analyses
        await loadPreviousAnalyses();
      }
      
      // Notify parent component about the analysis
      if (onAnalysisComplete) {
        onAnalysisComplete(data.analysis);
      }
      
      toast({
        title: t('ai.analysisComplete'),
        description: t('ai.analysisAvailable'),
      });
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: t('common.error'),
        description: t('ai.analysisFailed'),
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteAnalysis = async (analysisId: string) => {
    try {
      const { error } = await supabase
        .from('ai_analyses')
        .delete()
        .eq('id', analysisId);

      if (error) throw error;

      toast({
        title: t('ai.analysisDeleted'),
        description: t('ai.analysisDeletedDesc'),
      });

      await loadPreviousAnalyses();
    } catch (error) {
      console.error('Error deleting analysis:', error);
      toast({
        title: t('common.error'),
        description: t('ai.deleteFailed'),
        variant: "destructive",
      });
    }
  };

  const handleLoadPreviousAnalysis = (savedAnalysis: SavedAnalysis) => {
    setAnalysis(savedAnalysis.analysis);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(analysis);
      setCopied(true);
      toast({
        title: t('ai.copied'),
        description: t('ai.copiedDesc'),
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('ai.copyFailed'),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>{t('ai.title', { boardTitle })}</DialogTitle>
          <DialogDescription>
            {t('ai.description', { count: notes.length.toString() })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 h-full overflow-hidden">
          {/* Left: Notes Context & Previous Analyses */}
          <div className="space-y-4 flex flex-col h-full">
            <div>
              <Label className="text-sm font-semibold mb-2 block">
                {t('ai.notesLabel', { count: notes.length.toString() })}
              </Label>
              <ScrollArea className="h-[200px] rounded-lg border p-4 bg-muted/20">
                {notes.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    {t('ai.noNotesAvailable')}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <div key={note.id} className="text-xs">
                        <StickyNote {...note} isOwn={false} />
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="prompt">{t('ai.customPrompt')}</Label>
                {hasCustomPrompt && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    {t('ai.customPromptActive')}
                  </span>
                )}
              </div>
              <Textarea
                id="prompt"
                value={customPrompt}
                onChange={(e) => {
                  setCustomPrompt(e.target.value);
                  setHasCustomPrompt(e.target.value !== t('ai.defaultPrompt'));
                }}
                rows={8}
                placeholder={t('ai.promptPlaceholder')}
                className="resize-none font-mono text-sm"
              />
              {hasCustomPrompt && (
                <button
                  onClick={resetToDefaultPrompt}
                  className="text-sm text-primary hover:opacity-80 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {t('ai.resetToDefault')}
                </button>
              )}
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
                  {t('ai.analyzing')}
                </>
              ) : (
                t('ai.analyzeButton')
              )}
            </Button>

            {/* Previous Analyses */}
            <div className="flex-1 min-h-0">
              <Label className="text-sm font-semibold mb-2 block">
                {t('ai.previousAnalyses')}
              </Label>
              <ScrollArea className="h-full rounded-lg border bg-muted/20">
                {loadingPrevious ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : previousAnalyses.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center p-4">
                    {t('ai.noPreviousAnalyses')}
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {previousAnalyses.map((saved) => (
                      <div
                        key={saved.id}
                        className="p-3 rounded-lg bg-background border hover:border-primary/50 transition-colors cursor-pointer group"
                        onClick={() => handleLoadPreviousAnalysis(saved)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs text-muted-foreground">
                                {t('ai.createdAt')}: {format(new Date(saved.created_at), 'PPp')}
                              </p>
                            </div>
                            <p className="text-sm line-clamp-2">
                              {saved.analysis.substring(0, 100)}...
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAnalysis(saved.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Right: AI Analysis */}
          <div className="space-y-4 flex flex-col h-full">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">{t('ai.currentAnalysis')}</Label>
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
                      {t('ai.copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      {t('ai.copy')}
                    </>
                  )}
                </Button>
              )}
            </div>

            <ScrollArea className="flex-1 h-[600px] rounded-lg border bg-muted/20">
              <div className="p-6">
                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground min-h-[500px]">
                    <Loader2 className="w-12 h-12 animate-spin mb-4" />
                    <p>{t('ai.analyzingStatus')}</p>
                    <p className="text-sm mt-2">{t('ai.analyzingWait')}</p>
                  </div>
                ) : analysis ? (
                  <div className="prose prose-lg dark:prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-3xl font-bold mb-4 mt-6" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-2xl font-bold mb-3 mt-5" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-xl font-semibold mb-2 mt-4" {...props} />,
                        p: ({node, ...props}) => <p className="mb-4 leading-relaxed" {...props} />,
                        ul: ({node, ...props}) => <ul className="mb-4 space-y-2 list-disc pl-6" {...props} />,
                        ol: ({node, ...props}) => <ol className="mb-4 space-y-2 list-decimal pl-6" {...props} />,
                        li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                        em: ({node, ...props}) => <em className="italic" {...props} />,
                        blockquote: ({node, ...props}) => (
                          <blockquote className="border-l-4 border-primary pl-4 italic my-4" {...props} />
                        ),
                        code: ({node, inline, className, children, ...props}: any) => 
                          inline ? (
                            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                              {children}
                            </code>
                          ) : (
                            <code className="block bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto" {...props}>
                              {children}
                            </code>
                          ),
                      }}
                    >
                      {analysis}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground min-h-[500px]">
                    <p>{t('ai.noAnalysisYet')}</p>
                    <p className="text-sm mt-2">{t('ai.clickToStart')}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  Import,
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface Note {
  id: string;
  questionId: string;
  content: string;
  authorName: string;
  authorId: string;
  colorIndex: number;
}

interface Board {
  id: string;
  title: string;
  questions: { id: string; title: string }[];
}

interface ImportNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBoard: Board;
  allBoards: Board[];
  allNotes: Note[];
  workshopId: string;
  onImportComplete: () => void;
}

interface ClusterResult {
  note: { id: string; content: string; authorName: string };
  confidence: number;
}

export function ImportNotesDialog({
  open,
  onOpenChange,
  currentBoard,
  allBoards,
  allNotes,
  workshopId,
  onImportComplete,
}: ImportNotesDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<string[]>(["", ""]);
  const [context, setContext] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [clusterPreview, setClusterPreview] = useState<Record<string, ClusterResult[]> | null>(null);
  const [activeTab, setActiveTab] = useState<"select" | "cluster" | "preview">("select");

  // Get notes from OTHER boards (not current board)
  const otherBoardNotes = useMemo(() => {
    const currentBoardQuestionIds = new Set(currentBoard.questions.map(q => q.id));
    return allNotes.filter(note => !currentBoardQuestionIds.has(note.questionId));
  }, [allNotes, currentBoard]);

  // Group notes by board
  const notesByBoard = useMemo(() => {
    const grouped: Record<string, { board: Board; notes: Note[] }> = {};
    
    otherBoardNotes.forEach(note => {
      const board = allBoards.find(b => b.questions.some(q => q.id === note.questionId));
      if (board && board.id !== currentBoard.id) {
        if (!grouped[board.id]) {
          grouped[board.id] = { board, notes: [] };
        }
        grouped[board.id].notes.push(note);
      }
    });
    
    return Object.values(grouped);
  }, [otherBoardNotes, allBoards, currentBoard.id]);

  const selectedNotes = useMemo(() => 
    otherBoardNotes.filter(n => selectedNoteIds.has(n.id)),
    [otherBoardNotes, selectedNoteIds]
  );

  const handleToggleNote = (noteId: string) => {
    const newSet = new Set(selectedNoteIds);
    if (newSet.has(noteId)) {
      newSet.delete(noteId);
    } else {
      newSet.add(noteId);
    }
    setSelectedNoteIds(newSet);
  };

  const handleSelectAll = (boardId: string) => {
    const boardData = notesByBoard.find(b => b.board.id === boardId);
    if (!boardData) return;
    
    const newSet = new Set(selectedNoteIds);
    boardData.notes.forEach(note => newSet.add(note.id));
    setSelectedNoteIds(newSet);
  };

  const handleDeselectAll = (boardId: string) => {
    const boardData = notesByBoard.find(b => b.board.id === boardId);
    if (!boardData) return;
    
    const newSet = new Set(selectedNoteIds);
    boardData.notes.forEach(note => newSet.delete(note.id));
    setSelectedNoteIds(newSet);
  };

  const handleAddCategory = () => {
    if (categories.length < 8) {
      setCategories([...categories, ""]);
    }
  };

  const handleRemoveCategory = (index: number) => {
    if (categories.length > 2) {
      setCategories(categories.filter((_, i) => i !== index));
    }
  };

  const handleCategoryChange = (index: number, value: string) => {
    const newCategories = [...categories];
    newCategories[index] = value;
    setCategories(newCategories);
  };

  const validCategories = categories.filter(c => c.trim().length > 0);

  const handlePreviewClustering = async () => {
    if (selectedNotes.length === 0) {
      toast({
        title: t('import.noNotesSelected'),
        description: t('import.selectNotesFirst'),
        variant: "destructive",
      });
      return;
    }

    if (validCategories.length < 2) {
      toast({
        title: t('import.needCategories'),
        description: t('import.addAtLeastTwoCategories'),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setClusterPreview(null);

    try {
      const { data, error } = await supabase.functions.invoke('cluster-notes', {
        body: {
          notes: selectedNotes.map(n => ({
            id: n.id,
            content: n.content,
            authorName: n.authorName,
          })),
          categories: validCategories,
          context: context.trim() || undefined,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setClusterPreview(data.clusters);
      setActiveTab("preview");
      
      toast({
        title: t('import.clusteringComplete'),
        description: t('import.reviewResults'),
      });

    } catch (error) {
      console.error("Clustering error:", error);
      toast({
        title: t('import.clusteringFailed'),
        description: error instanceof Error ? error.message : t('common.error'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!clusterPreview) return;

    setIsLoading(true);

    try {
      // Get max order_index for questions in current board
      const { data: existingQuestions } = await supabase
        .from('questions')
        .select('order_index')
        .eq('board_id', currentBoard.id)
        .order('order_index', { ascending: false })
        .limit(1);

      let nextOrderIndex = (existingQuestions?.[0]?.order_index ?? -1) + 1;

      // Create questions and notes for each cluster
      for (const [categoryName, clusteredNotes] of Object.entries(clusterPreview)) {
        if (clusteredNotes.length === 0) continue;

        // Create new question for this category
        const { data: newQuestion, error: questionError } = await supabase
          .from('questions')
          .insert({
            board_id: currentBoard.id,
            title: categoryName,
            order_index: nextOrderIndex++,
          })
          .select()
          .single();

        if (questionError) {
          console.error("Error creating question:", questionError);
          continue;
        }

        // Find original notes to get full data
        const notesToInsert = clusteredNotes.map(cn => {
          const originalNote = selectedNotes.find(n => n.id === cn.note.id);
          if (!originalNote) return null;
          
          return {
            question_id: newQuestion.id,
            content: originalNote.content,
            author_name: originalNote.authorName,
            author_id: originalNote.authorId,
            color_index: originalNote.colorIndex,
          };
        }).filter(Boolean);

        if (notesToInsert.length > 0) {
          const { error: notesError } = await supabase
            .from('notes')
            .insert(notesToInsert);

          if (notesError) {
            console.error("Error inserting notes:", notesError);
          }
        }
      }

      toast({
        title: t('import.importSuccess'),
        description: t('import.notesImported', { count: String(selectedNotes.length) }),
      });

      // Reset and close
      setSelectedNoteIds(new Set());
      setCategories(["", ""]);
      setContext("");
      setClusterPreview(null);
      setActiveTab("select");
      onOpenChange(false);
      onImportComplete();

    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: t('import.importFailed'),
        description: error instanceof Error ? error.message : t('common.error'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedNoteIds(new Set());
    setCategories(["", ""]);
    setContext("");
    setClusterPreview(null);
    setActiveTab("select");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Import className="w-5 h-5" />
            {t('import.title')}
          </DialogTitle>
          <DialogDescription>
            {t('import.description', { boardTitle: currentBoard.title })}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="select" className="gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-semibold">1</span>
              {t('import.selectNotes')}
            </TabsTrigger>
            <TabsTrigger value="cluster" className="gap-2" disabled={selectedNotes.length === 0}>
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-semibold">2</span>
              {t('import.defineCategories')}
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2" disabled={!clusterPreview}>
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-semibold">3</span>
              {t('import.preview')}
            </TabsTrigger>
          </TabsList>

          {/* Step 1: Select Notes */}
          <TabsContent value="select" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {notesByBoard.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                  <p>{t('import.noNotesAvailable')}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {notesByBoard.map(({ board, notes }) => (
                    <div key={board.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-lg">{board.title}</h3>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSelectAll(board.id)}
                          >
                            {t('import.selectAll')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeselectAll(board.id)}
                          >
                            {t('import.deselectAll')}
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {notes.map((note) => (
                          <label
                            key={note.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedNoteIds.has(note.id)
                                ? 'bg-primary/10 border-primary'
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            <Checkbox
                              checked={selectedNoteIds.has(note.id)}
                              onCheckedChange={() => handleToggleNote(note.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm line-clamp-2">{note.content}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                — {note.authorName}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Badge variant="secondary">
                {t('import.selectedCount', { count: String(selectedNotes.length) })}
              </Badge>
              <Button
                onClick={() => setActiveTab("cluster")}
                disabled={selectedNotes.length === 0}
              >
                {t('common.next')}
              </Button>
            </div>
          </TabsContent>

          {/* Step 2: Define Categories */}
          <TabsContent value="cluster" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-semibold">{t('import.categoriesLabel')}</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t('import.categoriesDescription')}
                  </p>
                  <div className="space-y-2">
                    {categories.map((category, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-semibold">
                          {index + 1}
                        </span>
                        <Input
                          value={category}
                          onChange={(e) => handleCategoryChange(index, e.target.value)}
                          placeholder={t('import.categoryPlaceholder', { index: String(index + 1) })}
                          className="flex-1"
                        />
                        {categories.length > 2 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveCategory(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  {categories.length < 8 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddCategory}
                      className="mt-2"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('import.addCategory')}
                    </Button>
                  )}
                </div>

                <div>
                  <Label className="text-base font-semibold">{t('import.contextLabel')}</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t('import.contextDescription')}
                  </p>
                  <Textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder={t('import.contextPlaceholder')}
                    rows={3}
                  />
                </div>
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Button variant="outline" onClick={() => setActiveTab("select")}>
                {t('common.back')}
              </Button>
              <Button
                onClick={handlePreviewClustering}
                disabled={isLoading || validCategories.length < 2}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('import.clustering')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {t('import.previewClustering')}
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Step 3: Preview Results */}
          <TabsContent value="preview" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {clusterPreview && (
                <div className="space-y-4">
                  {Object.entries(clusterPreview).map(([category, notes]) => (
                    <div key={category} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold">{category}</h3>
                        <Badge variant="secondary">{notes.length}</Badge>
                      </div>
                      <div className="space-y-2">
                        {notes.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3 p-2 rounded bg-muted/50"
                          >
                            <div className="flex-1">
                              <p className="text-sm">{item.note.content}</p>
                              <p className="text-xs text-muted-foreground">
                                — {item.note.authorName}
                              </p>
                            </div>
                            <Badge variant="outline" className="shrink-0">
                              {Math.round(item.confidence * 100)}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Button variant="outline" onClick={() => setActiveTab("cluster")}>
                {t('common.back')}
              </Button>
              <Button
                onClick={handleImport}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('import.importing')}
                  </>
                ) : (
                  <>
                    <Import className="w-4 h-4" />
                    {t('import.confirmImport')}
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

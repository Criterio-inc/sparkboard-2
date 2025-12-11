import { useState, useMemo, useEffect } from "react";
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
  AlertCircle,
  FolderOpen
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

// New interface for category items
interface CategoryItem {
  id?: string;         // question_id if existing, undefined if new
  title: string;       // category name
  isExisting: boolean; // true = existing question, false = new
  enabled: boolean;    // whether to use this category for clustering
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
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [context, setContext] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [clusterPreview, setClusterPreview] = useState<Record<string, ClusterResult[]> | null>(null);
  const [editedCategories, setEditedCategories] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"select" | "method" | "cluster" | "preview">("select");

  // Initialize categories from current board's questions when dialog opens
  useEffect(() => {
    if (open) {
      if (currentBoard.questions.length > 0) {
        // Load existing categories from current board
        const existingCategories: CategoryItem[] = currentBoard.questions.map(q => ({
          id: q.id,
          title: q.title,
          isExisting: true,
          enabled: true,
        }));
        setCategories(existingCategories);
      } else {
        // Fallback: two empty categories if none exist
        setCategories([
          { title: "", isExisting: false, enabled: true },
          { title: "", isExisting: false, enabled: true },
        ]);
      }
    }
  }, [open, currentBoard.questions]);

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
    if (categories.length < 10) {
      setCategories([...categories, { title: "", isExisting: false, enabled: true }]);
    }
  };

  const handleRemoveCategory = (index: number) => {
    // Only allow removing NEW categories, not existing ones
    const category = categories[index];
    if (!category.isExisting) {
      setCategories(categories.filter((_, i) => i !== index));
    }
  };

  const handleCategoryChange = (index: number, value: string) => {
    const newCategories = [...categories];
    newCategories[index] = { ...newCategories[index], title: value };
    setCategories(newCategories);
  };

  const handleToggleCategoryEnabled = (index: number) => {
    const newCategories = [...categories];
    newCategories[index] = { ...newCategories[index], enabled: !newCategories[index].enabled };
    setCategories(newCategories);
  };

  const handleRenameCategory = (originalName: string, newName: string) => {
    setEditedCategories(prev => ({
      ...prev,
      [originalName]: newName,
    }));
  };

  // Get enabled categories with valid titles
  const enabledCategories = categories.filter(c => c.enabled && c.title.trim().length > 0);

  const handlePreviewClustering = async () => {
    if (selectedNotes.length === 0) {
      toast({
        title: t('import.noNotesSelected'),
        description: t('import.selectNotesFirst'),
        variant: "destructive",
      });
      return;
    }

    if (enabledCategories.length < 2) {
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
          categories: enabledCategories.map(c => c.title),
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

  // Fuzzy matching function to find the best category match
  const findMatchingCategory = (categoryName: string): CategoryItem | undefined => {
    const normalizedName = categoryName.toLowerCase().trim();
    
    // 1. Exact match on title
    let match = categories.find(c => 
      c.enabled && c.title.toLowerCase().trim() === normalizedName
    );
    if (match) return match;
    
    // 2. Match against edited name
    const editedName = editedCategories[categoryName]?.toLowerCase().trim();
    if (editedName) {
      match = categories.find(c => 
        c.enabled && c.title.toLowerCase().trim() === editedName
      );
      if (match) return match;
    }
    
    // 3. Match by main part (before first •)
    const mainPart = normalizedName.split('•')[0].trim();
    match = categories.find(c => {
      if (!c.enabled) return false;
      const catMainPart = c.title.toLowerCase().split('•')[0].trim();
      return catMainPart === mainPart || mainPart.includes(catMainPart) || catMainPart.includes(mainPart);
    });
    if (match) return match;
    
    // 4. Keyword overlap - extract words and find best match
    const extractKeywords = (text: string) => 
      text.toLowerCase()
        .split(/[•&,\-–—\s]+/)
        .filter(w => w.length > 2)
        .filter(w => !['och', 'för', 'med', 'att', 'som'].includes(w));
    
    const inputKeywords = extractKeywords(categoryName);
    let bestMatch: { category: CategoryItem; overlap: number } | null = null;
    
    for (const cat of categories) {
      if (!cat.enabled) continue;
      const catKeywords = extractKeywords(cat.title);
      const overlap = inputKeywords.filter(k => catKeywords.some(ck => ck.includes(k) || k.includes(ck))).length;
      if (overlap > 0 && (!bestMatch || overlap > bestMatch.overlap)) {
        bestMatch = { category: cat, overlap };
      }
    }
    
    if (bestMatch) return bestMatch.category;
    
    return undefined;
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

        // Use edited name if available, otherwise use original
        const finalCategoryName = (editedCategories[categoryName] ?? categoryName).trim() || categoryName;

        // Find matching category using fuzzy matching
        const matchingCategory = findMatchingCategory(categoryName);

        let questionId: string;

        if (matchingCategory?.isExisting && matchingCategory.id) {
          // REUSE existing question
          questionId = matchingCategory.id;
          console.log(`📂 Använder befintlig kategori: ${matchingCategory.title} (${questionId})`);
        } else {
          // CREATE new question (either new category or no match found)
          const { data: newQuestion, error: questionError } = await supabase
            .from('questions')
            .insert({
              board_id: currentBoard.id,
              title: finalCategoryName,
              order_index: nextOrderIndex++,
            })
            .select()
            .single();

          if (questionError) {
            console.error("Error creating question:", questionError);
            continue;
          }
          questionId = newQuestion.id;
          console.log(`➕ Skapade ny kategori: ${finalCategoryName} (${questionId})`);
        }

        // Find original notes to get full data
        const notesToInsert = clusteredNotes.map(cn => {
          const originalNote = selectedNotes.find(n => n.id === cn.note.id);
          if (!originalNote) return null;
          
          return {
            question_id: questionId,
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
      handleClose();
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

  const handleManualImport = async () => {
    if (selectedNotes.length === 0) return;
    
    setIsLoading(true);
    
    try {
      // Get max order_index for questions in current board
      const { data: existingQuestions } = await supabase
        .from('questions')
        .select('id, title, order_index')
        .eq('board_id', currentBoard.id)
        .order('order_index', { ascending: false });
      
      let questionId: string;
      
      // Check if "Importerade svar" already exists
      const importedQuestion = existingQuestions?.find(
        q => q.title === "Importerade svar"
      );
      
      if (importedQuestion) {
        // Use existing "Importerade svar" category
        questionId = importedQuestion.id;
      } else {
        // Create new "Importerade svar" category
        const nextOrderIndex = (existingQuestions?.[0]?.order_index ?? -1) + 1;
        
        const { data: newQuestion, error: questionError } = await supabase
          .from('questions')
          .insert({
            board_id: currentBoard.id,
            title: "Importerade svar",
            order_index: nextOrderIndex,
          })
          .select()
          .single();
        
        if (questionError) throw questionError;
        questionId = newQuestion.id;
      }
      
      // Import all selected notes to "Importerade svar"
      const notesToInsert = selectedNotes.map(note => ({
        question_id: questionId,
        content: note.content,
        author_name: note.authorName,
        author_id: note.authorId,
        color_index: note.colorIndex,
      }));
      
      const { error: notesError } = await supabase
        .from('notes')
        .insert(notesToInsert);
      
      if (notesError) throw notesError;
      
      toast({
        title: t('import.importSuccess'),
        description: t('import.manualImportComplete', { count: String(selectedNotes.length) }),
      });
      
      handleClose();
      onImportComplete();
      
    } catch (error) {
      console.error("Manual import error:", error);
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
    setCategories([]);
    setContext("");
    setClusterPreview(null);
    setEditedCategories({});
    setActiveTab("select");
    onOpenChange(false);
  };

  // Helper to check if a category in preview is existing (uses fuzzy matching)
  const getCategoryInfo = (categoryName: string) => {
    const matchingCategory = findMatchingCategory(categoryName);
    return {
      isExisting: matchingCategory?.isExisting ?? false,
      id: matchingCategory?.id,
    };
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="select" className="gap-1 text-xs sm:text-sm">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-semibold shrink-0">1</span>
              <span className="hidden sm:inline">{t('import.selectNotes')}</span>
              <span className="sm:hidden">Välj</span>
            </TabsTrigger>
            <TabsTrigger value="method" className="gap-1 text-xs sm:text-sm" disabled={selectedNotes.length === 0}>
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-semibold shrink-0">2</span>
              <span className="hidden sm:inline">{t('import.method')}</span>
              <span className="sm:hidden">Metod</span>
            </TabsTrigger>
            <TabsTrigger value="cluster" className="gap-1 text-xs sm:text-sm" disabled={activeTab !== "cluster" && activeTab !== "preview"}>
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-semibold shrink-0">3</span>
              <span className="hidden sm:inline">{t('import.defineCategories')}</span>
              <span className="sm:hidden">AI</span>
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-1 text-xs sm:text-sm" disabled={!clusterPreview}>
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-semibold shrink-0">4</span>
              <span className="hidden sm:inline">{t('import.preview')}</span>
              <span className="sm:hidden">Granska</span>
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
                onClick={() => setActiveTab("method")}
                disabled={selectedNotes.length === 0}
              >
                {t('common.next')}
              </Button>
            </div>
          </TabsContent>

          {/* Step 2: Select Method */}
          <TabsContent value="method" className="flex-1 min-h-0 mt-4">
            <div className="flex flex-col items-center justify-center h-[400px] gap-8">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">{t('import.selectMethod')}</h3>
                <p className="text-muted-foreground">
                  {t('import.selectedCount', { count: String(selectedNotes.length) })}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl w-full px-4">
                {/* Manual import */}
                <button 
                  onClick={handleManualImport}
                  disabled={isLoading}
                  className="flex flex-col items-center p-6 border-2 rounded-xl hover:border-primary hover:bg-primary/5 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="w-12 h-12 mb-4 text-primary animate-spin" />
                  ) : (
                    <Import className="w-12 h-12 mb-4 text-primary" />
                  )}
                  <span className="font-semibold text-lg">{t('import.manualImport')}</span>
                  <span className="text-sm text-muted-foreground text-center mt-2">
                    {t('import.manualDescription')}
                  </span>
                </button>
                
                {/* AI clustering */}
                <button 
                  onClick={() => setActiveTab("cluster")}
                  disabled={isLoading}
                  className="flex flex-col items-center p-6 border-2 rounded-xl hover:border-amber-500 hover:bg-amber-500/5 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-12 h-12 mb-4 text-amber-500" />
                  <span className="font-semibold text-lg">{t('import.aiClustering')}</span>
                  <span className="text-sm text-muted-foreground text-center mt-2">
                    {t('import.aiDescription')}
                  </span>
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-start mt-4 pt-4 border-t">
              <Button variant="outline" onClick={() => setActiveTab("select")}>
                {t('common.back')}
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
                  
                  {/* Existing categories section */}
                  {categories.some(c => c.isExisting) && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FolderOpen className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">Befintliga kategorier</span>
                      </div>
                      <div className="space-y-2">
                        {categories.filter(c => c.isExisting).map((category, idx) => {
                          const originalIndex = categories.findIndex(c => c.id === category.id);
                          return (
                            <div key={category.id} className="flex items-center gap-2">
                              <Checkbox
                                checked={category.enabled}
                                onCheckedChange={() => handleToggleCategoryEnabled(originalIndex)}
                              />
                              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-semibold">
                                {idx + 1}
                              </span>
                              <div className={`flex-1 px-3 py-2 rounded-md border ${category.enabled ? 'bg-primary/5 border-primary/30' : 'bg-muted/50 border-border text-muted-foreground'}`}>
                                {category.title}
                              </div>
                              <Badge variant="outline" className="shrink-0 text-xs">
                                Befintlig
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* New categories section */}
                  {categories.some(c => !c.isExisting) && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Plus className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">Nya kategorier</span>
                      </div>
                      <div className="space-y-2">
                        {categories.filter(c => !c.isExisting).map((category) => {
                          const originalIndex = categories.indexOf(category);
                          const newCategoryIndex = categories.filter(c => !c.isExisting).indexOf(category);
                          const existingCount = categories.filter(c => c.isExisting).length;
                          return (
                            <div key={originalIndex} className="flex items-center gap-2">
                              <Checkbox
                                checked={category.enabled}
                                onCheckedChange={() => handleToggleCategoryEnabled(originalIndex)}
                              />
                              <span className="w-6 h-6 rounded-full bg-green-600/20 text-green-600 text-xs flex items-center justify-center font-semibold">
                                {existingCount + newCategoryIndex + 1}
                              </span>
                              <Input
                                value={category.title}
                                onChange={(e) => handleCategoryChange(originalIndex, e.target.value)}
                                placeholder={t('import.categoryPlaceholder', { index: String(existingCount + newCategoryIndex + 1) })}
                                className={`flex-1 ${!category.enabled ? 'opacity-50' : ''}`}
                                disabled={!category.enabled}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveCategory(originalIndex)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {categories.length < 10 && (
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
              <Button variant="outline" onClick={() => setActiveTab("method")}>
                {t('common.back')}
              </Button>
              <Button
                onClick={handlePreviewClustering}
                disabled={isLoading || enabledCategories.length < 2}
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
            <p className="text-sm text-muted-foreground mb-3">
              {t('import.editCategoriesHint')}
            </p>
            <ScrollArea className="h-[380px] pr-4">
              {clusterPreview && (
                <div className="space-y-4">
                  {Object.entries(clusterPreview).map(([category, notes]) => {
                    const categoryInfo = getCategoryInfo(category);
                    return (
                      <div key={category} className={`border rounded-lg p-4 ${categoryInfo.isExisting ? 'border-primary/30 bg-primary/5' : 'border-green-600/30 bg-green-600/5'}`}>
                        <div className="flex items-center gap-2 mb-3">
                          {categoryInfo.isExisting ? (
                            <FolderOpen className="w-5 h-5 text-primary shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                          )}
                          <Input
                            value={editedCategories[category] ?? category}
                            onChange={(e) => handleRenameCategory(category, e.target.value)}
                            className="font-semibold h-8 text-base"
                            placeholder={t('import.categoryNamePlaceholder')}
                          />
                          <Badge 
                            variant={categoryInfo.isExisting ? "outline" : "secondary"} 
                            className={`shrink-0 ${categoryInfo.isExisting ? 'border-primary text-primary' : 'bg-green-600/20 text-green-600 border-green-600'}`}
                          >
                            {categoryInfo.isExisting ? 'Läggs till' : 'Ny'}
                          </Badge>
                          <Badge variant="secondary" className="shrink-0">{notes.length}</Badge>
                        </div>
                        <div className="space-y-2">
                          {notes.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-3 p-2 rounded bg-background/80"
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
                    );
                  })}
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

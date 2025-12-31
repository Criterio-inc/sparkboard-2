import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Play, 
  Pause, 
  SkipForward, 
  Sparkles, 
  FileText,
  Import,
  Lock
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface ControlPanelProps {
  isTimerRunning: boolean;
  onToggleTimer: () => void;
  onNextBoard: () => void;
  onAIAnalysis: () => void;
  onExportPDF: () => void;
  onImportNotes: () => void;
  canGoNext: boolean;
}

export const ControlPanel = ({
  isTimerRunning,
  onToggleTimer,
  onNextBoard,
  onAIAnalysis,
  onExportPDF,
  onImportNotes,
  canGoNext,
}: ControlPanelProps) => {
  const { t } = useLanguage();
  const { isPro, isCuragoUser } = useSubscription();
  const { toast } = useToast();
  
  const canUseAI = isPro || isCuragoUser;

  const handleAIClick = () => {
    if (canUseAI) {
      onAIAnalysis();
    } else {
      toast({
        title: t('ai.proRequired'),
        description: t('ai.proRequiredDesc'),
      });
    }
  };
  
  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Button
            onClick={onToggleTimer}
            variant={isTimerRunning ? "destructive" : "default"}
            size="sm"
            className="h-auto py-3 flex-col gap-2"
          >
            {isTimerRunning ? (
              <>
                <Pause className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                <span className="text-xs font-semibold">{t('control.pause')}</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                <span className="text-xs font-semibold">{t('control.start')}</span>
              </>
            )}
          </Button>

          <Button
            onClick={onNextBoard}
            variant="default"
            size="sm"
            disabled={!canGoNext}
            className="h-auto py-3 flex-col gap-2 bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(var(--secondary))] hover:shadow-[var(--shadow-accent)] group"
          >
            <SkipForward className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
            <span className="text-xs font-semibold">{t('control.nextBoard')}</span>
          </Button>

          <Button
            onClick={onImportNotes}
            variant="secondary"
            size="sm"
            className="h-auto py-3 flex-col gap-2 group"
          >
            <Import className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
            <span className="text-xs font-semibold">{t('control.importNotes')}</span>
          </Button>

          <Button
            onClick={handleAIClick}
            variant="accent"
            size="sm"
            className={`h-auto py-3 flex-col gap-2 relative group ${
              canUseAI 
                ? 'bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] hover:shadow-[var(--shadow-button-hover)]' 
                : 'opacity-75'
            }`}
          >
            {!canUseAI && (
              <Badge className="absolute -top-2 -right-2 bg-yellow-500 text-white text-[10px] px-1.5 py-0.5">
                Pro
              </Badge>
            )}
            {canUseAI ? (
              <Sparkles className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            <span className="text-xs font-semibold">{t('control.aiAnalysis')}</span>
          </Button>

          <Button
            onClick={onExportPDF}
            variant="outline"
            size="sm"
            className="h-auto py-3 flex-col gap-2 group"
          >
            <FileText className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
            <span className="text-xs font-semibold">{t('control.exportPDF')}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
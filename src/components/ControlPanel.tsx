import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Play, 
  Pause, 
  SkipForward, 
  Sparkles, 
  FileText
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ControlPanelProps {
  isTimerRunning: boolean;
  onToggleTimer: () => void;
  onNextBoard: () => void;
  onAIAnalysis: () => void;
  onExportPDF: () => void;
  canGoNext: boolean;
}

export const ControlPanel = ({
  isTimerRunning,
  onToggleTimer,
  onNextBoard,
  onAIAnalysis,
  onExportPDF,
  canGoNext,
}: ControlPanelProps) => {
  const { t } = useLanguage();
  
  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
            onClick={onAIAnalysis}
            variant="accent"
            size="sm"
            className="h-auto py-3 flex-col gap-2 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] hover:shadow-[var(--shadow-button-hover)] group"
          >
            <Sparkles className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
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

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Play, 
  Pause, 
  SkipForward, 
  Sparkles, 
  FileText,
  Volume2,
  VolumeX
} from "lucide-react";

interface ControlPanelProps {
  isTimerRunning: boolean;
  onToggleTimer: () => void;
  onNextBoard: () => void;
  onAIAnalysis: () => void;
  onExportPDF: () => void;
  isSoundEnabled: boolean;
  onToggleSound: () => void;
  canGoNext: boolean;
}

export const ControlPanel = ({
  isTimerRunning,
  onToggleTimer,
  onNextBoard,
  onAIAnalysis,
  onExportPDF,
  isSoundEnabled,
  onToggleSound,
  canGoNext,
}: ControlPanelProps) => {
  return (
    <Card className="bg-gradient-to-br from-card to-muted/20">
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Button
            onClick={onToggleTimer}
            variant={isTimerRunning ? "destructive" : "default"}
            size="sm"
            className="h-auto py-3 flex-col gap-1.5"
          >
            {isTimerRunning ? (
              <>
                <Pause className="w-4 h-4" />
                <span className="text-xs">Pausa</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span className="text-xs">Starta</span>
              </>
            )}
          </Button>

          <Button
            onClick={onNextBoard}
            variant="secondary"
            size="sm"
            disabled={!canGoNext}
            className="h-auto py-3 flex-col gap-1.5"
          >
            <SkipForward className="w-4 h-4" />
            <span className="text-xs">Nästa Board</span>
          </Button>

          <Button
            onClick={onAIAnalysis}
            variant="hero"
            size="sm"
            className="h-auto py-3 flex-col gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-xs">AI-Analys</span>
          </Button>

          <Button
            onClick={onExportPDF}
            variant="outline"
            size="sm"
            className="h-auto py-3 flex-col gap-1.5"
          >
            <FileText className="w-4 h-4" />
            <span className="text-xs">Export PDF</span>
          </Button>

          <Button
            onClick={onToggleSound}
            variant="ghost"
            size="sm"
            className="h-auto py-3 flex-col gap-1.5"
          >
            {isSoundEnabled ? (
              <>
                <Volume2 className="w-4 h-4" />
                <span className="text-xs">Ljud På</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4" />
                <span className="text-xs">Ljud Av</span>
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

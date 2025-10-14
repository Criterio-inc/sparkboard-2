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
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Button
            onClick={onToggleTimer}
            variant={isTimerRunning ? "destructive" : "default"}
            size="lg"
            className="h-auto py-4 flex-col gap-2"
          >
            {isTimerRunning ? (
              <>
                <Pause className="w-6 h-6" />
                <span className="text-sm">Pausa Timer</span>
              </>
            ) : (
              <>
                <Play className="w-6 h-6" />
                <span className="text-sm">Starta Timer</span>
              </>
            )}
          </Button>

          <Button
            onClick={onNextBoard}
            variant="secondary"
            size="lg"
            disabled={!canGoNext}
            className="h-auto py-4 flex-col gap-2"
          >
            <SkipForward className="w-6 h-6" />
            <span className="text-sm">Nästa Board</span>
          </Button>

          <Button
            onClick={onAIAnalysis}
            variant="hero"
            size="lg"
            className="h-auto py-4 flex-col gap-2"
          >
            <Sparkles className="w-6 h-6" />
            <span className="text-sm">AI-Analys</span>
          </Button>

          <Button
            onClick={onExportPDF}
            variant="outline"
            size="lg"
            className="h-auto py-4 flex-col gap-2"
          >
            <FileText className="w-6 h-6" />
            <span className="text-sm">Exportera PDF</span>
          </Button>

          <Button
            onClick={onToggleSound}
            variant="ghost"
            size="lg"
            className="h-auto py-4 flex-col gap-2"
          >
            {isSoundEnabled ? (
              <>
                <Volume2 className="w-6 h-6" />
                <span className="text-sm">Ljud På</span>
              </>
            ) : (
              <>
                <VolumeX className="w-6 h-6" />
                <span className="text-sm">Ljud Av</span>
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

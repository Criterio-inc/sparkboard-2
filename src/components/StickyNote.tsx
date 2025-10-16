import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StickyNoteProps {
  id: string;
  content: string;
  authorName: string;
  timestamp: string;
  colorIndex: number;
  onDelete?: () => void;
  isOwn?: boolean;
}

const noteColors = [
  "bg-[hsl(var(--note-1))] border-[hsl(var(--note-1))]",
  "bg-[hsl(var(--note-2))] border-[hsl(var(--note-2))]",
  "bg-[hsl(var(--note-3))] border-[hsl(var(--note-3))]",
  "bg-[hsl(var(--note-4))] border-[hsl(var(--note-4))]",
  "bg-[hsl(var(--note-5))] border-[hsl(var(--note-5))]",
];

const rotations = [
  "rotate-[-2deg]",
  "rotate-[1deg]",
  "rotate-[-1deg]",
  "rotate-[2deg]",
  "rotate-[-3deg]",
  "rotate-[3deg]",
];

export const StickyNote = ({
  content,
  authorName,
  timestamp,
  colorIndex,
  onDelete,
  isOwn,
}: StickyNoteProps) => {
  const colorClass = noteColors[colorIndex % noteColors.length];
  const rotationClass = rotations[Math.floor(Math.random() * rotations.length)];

  return (
    <div
      className={`relative p-4 rounded-2xl shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-button-hover)] transition-all duration-300 hover:-translate-y-1 min-h-[140px] flex flex-col ${colorClass} ${rotationClass} animate-sticky-appear border-t-8`}
      style={{
        "--rotation": rotationClass.match(/\[(.*?)\]/)?.[1] || "0deg",
      } as React.CSSProperties}
    >
      <div className="flex-1 mb-3">
        <p className="text-sm text-foreground break-words whitespace-pre-wrap">
          {content}
        </p>
      </div>

      <div className="flex items-center justify-end text-xs text-muted-foreground pt-2 border-t border-muted">
        <div className="flex items-center gap-2">
          <span className="opacity-75">{timestamp}</span>
          {isOwn && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-6 w-6 hover:bg-destructive/20 hover:text-destructive"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

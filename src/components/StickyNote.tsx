import { Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StickyNoteProps {
  id: string;
  content: string;
  authorName: string;
  timestamp: string;
  colorIndex: number;
  onDelete?: () => void;
  isOwn?: boolean;
  canDelete?: boolean;
  draggable?: boolean;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
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
  id,
  content,
  authorName,
  timestamp,
  colorIndex,
  onDelete,
  isOwn,
  canDelete,
  draggable,
  onDragStart,
  onDragEnd,
}: StickyNoteProps) => {
  const colorClass = noteColors[colorIndex % noteColors.length];
  const rotationClass = rotations[Math.floor(Math.random() * rotations.length)];
  const showDeleteButton = (isOwn || canDelete) && onDelete;

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        if (draggable) {
          e.dataTransfer.setData('text/plain', id);
          e.dataTransfer.effectAllowed = 'move';
          onDragStart?.(id);
        }
      }}
      onDragEnd={() => {
        if (draggable) {
          onDragEnd?.();
        }
      }}
      className={`relative p-4 rounded-2xl shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-button-hover)] transition-all duration-300 hover:-translate-y-1 min-h-[140px] flex flex-col ${colorClass} ${rotationClass} animate-sticky-appear border-t-8 ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
      style={{
        "--rotation": rotationClass.match(/\[(.*?)\]/)?.[1] || "0deg",
      } as React.CSSProperties}
    >
      {/* Drag handle indicator */}
      {draggable && (
        <div className="absolute top-2 left-2 opacity-40 hover:opacity-70 transition-opacity">
          <GripVertical className="w-4 h-4 text-[hsl(var(--note-text))]" />
        </div>
      )}

      <div className="flex-1 mb-3">
        <p className="text-sm text-[hsl(var(--note-text))] break-words whitespace-pre-wrap">
          {content}
        </p>
      </div>

      <div className="flex items-center justify-end text-xs text-[hsl(var(--note-text))] opacity-75 pt-2 border-t border-[hsl(var(--note-text))]/20">
        <div className="flex items-center gap-2">
          <span className="opacity-75">{timestamp}</span>
          {showDeleteButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
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

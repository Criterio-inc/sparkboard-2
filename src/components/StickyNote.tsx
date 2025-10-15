import { Trash2, User } from "lucide-react";
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
  "bg-yellow-200 border-yellow-300",
  "bg-pink-200 border-pink-300",
  "bg-blue-200 border-blue-300",
  "bg-green-200 border-green-300",
  "bg-purple-200 border-purple-300",
  "bg-orange-200 border-orange-300",
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
      className={`relative p-4 rounded-sm shadow-md hover:shadow-xl transition-shadow duration-300 min-h-[140px] flex flex-col ${colorClass} ${rotationClass} animate-sticky-appear border-t-8`}
      style={{
        "--rotation": rotationClass.match(/\[(.*?)\]/)?.[1] || "0deg",
      } as React.CSSProperties}
    >
      <div className="flex-1 mb-3">
        <p className="text-sm text-gray-800 break-words whitespace-pre-wrap">
          {content}
        </p>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-400/30">
        <div className="flex items-center gap-1">
          <User className="w-3 h-3" />
          <span className="font-medium">{authorName}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="opacity-75">{timestamp}</span>
          {isOwn && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-6 w-6 hover:bg-red-500/20 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

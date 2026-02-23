import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface TimelineControlsProps {
  currentFrame: number;
  totalFrames: number;
  isPlaying: boolean;
  onFrameChange: (frame: number) => void;
  onPlay: () => void;
  onPause: () => void;
}

export function TimelineControls({
  currentFrame,
  totalFrames,
  isPlaying,
  onFrameChange,
  onPlay,
  onPause,
}: TimelineControlsProps) {
  if (totalFrames < 2) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-black/60 backdrop-blur-sm border-t border-white/10">
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
        onClick={() => onFrameChange(0)}
      >
        <SkipBack className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-white hover:bg-white/10 rounded-full border border-white/20"
        onClick={isPlaying ? onPause : onPlay}
      >
        {isPlaying ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5 ml-0.5" />
        )}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
        onClick={() => onFrameChange(totalFrames - 1)}
      >
        <SkipForward className="h-3.5 w-3.5" />
      </Button>

      <div className="flex-1">
        <Slider
          min={0}
          max={totalFrames - 1}
          step={1}
          value={[currentFrame]}
          onValueChange={([v]) => onFrameChange(v)}
          className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary [&_.relative]:bg-white/20"
        />
      </div>

      <span className="text-xs text-white/60 font-mono tabular-nums whitespace-nowrap">
        {currentFrame + 1} / {totalFrames}
      </span>
    </div>
  );
}

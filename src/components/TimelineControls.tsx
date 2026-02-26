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
  const hasFrames = totalFrames >= 2;

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-t border-border/40 bg-card/60 backdrop-blur-sm">
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => onFrameChange(0)}
        disabled={!hasFrames}
        title="First frame"
      >
        <SkipBack className="h-3.5 w-3.5" />
      </Button>

      <Button
        size="icon"
        variant="outline"
        className="h-8 w-8 shrink-0 rounded-full"
        onClick={isPlaying ? onPause : onPlay}
        disabled={!hasFrames}
        title={isPlaying ? "Pause" : "Play"}
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
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => onFrameChange(Math.max(0, totalFrames - 1))}
        disabled={!hasFrames}
        title="Last frame"
      >
        <SkipForward className="h-3.5 w-3.5" />
      </Button>

      <div className="flex-1 px-1">
        {hasFrames ? (
          <Slider
            min={0}
            max={totalFrames - 1}
            step={1}
            value={[currentFrame]}
            onValueChange={([v]) => onFrameChange(v)}
            className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_.relative]:bg-muted"
          />
        ) : (
          <div className="h-2 rounded-full bg-muted animate-pulse" />
        )}
      </div>

      <span className="text-xs text-muted-foreground font-mono tabular-nums whitespace-nowrap shrink-0">
        {hasFrames ? `${currentFrame + 1} / ${totalFrames}` : "Loading…"}
      </span>
    </div>
  );
}

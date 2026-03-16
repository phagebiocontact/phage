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
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
}

export function TimelineControls({
  currentFrame,
  totalFrames,
  isPlaying,
  onFrameChange,
  onPlay,
  onPause,
  playbackSpeed,
  onSpeedChange,
}: TimelineControlsProps) {
  const hasFrames = totalFrames >= 2;

  const cycleSpeed = () => {
    const next = playbackSpeed >= 2 ? 0.25 : playbackSpeed + 0.25;
    onSpeedChange(next);
  };

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

      <span className="text-xs text-muted-foreground font-mono tabular-nums whitespace-nowrap shrink-0 border-l border-border/40 pl-3 ml-1">
        {hasFrames ? `${currentFrame + 1} / ${totalFrames}` : "Loading…"}
      </span>

      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-[46px] shrink-0 text-[11px] text-muted-foreground hover:text-foreground font-mono px-0"
        onClick={cycleSpeed}
        disabled={!hasFrames}
        title="Playback Speed"
      >
        {playbackSpeed}x
      </Button>
    </div>
  );
}

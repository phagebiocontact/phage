import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrajectoryTimelineProps {
	frameCount: number;
	currentFrame: number;
	isPlaying: boolean;
	onFrameChange: (frame: number) => void;
	onPlay: () => void;
	onPause: () => void;
}

export function TrajectoryTimeline({
	frameCount,
	currentFrame,
	isPlaying,
	onFrameChange,
	onPlay,
	onPause,
}: TrajectoryTimelineProps) {
	const maxFrame = Math.max(0, frameCount - 1);

	return (
		<div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-3">
			<div className="flex items-center justify-between gap-4">
				<div>
					<p className="text-xs uppercase tracking-wide text-muted-foreground">Timeline</p>
					<p className="text-sm font-semibold">
						Frame {currentFrame} / {maxFrame}
					</p>
				</div>
				<Button
					size="sm"
					variant="outline"
					onClick={isPlaying ? onPause : onPlay}
					className="h-8"
				>
					{isPlaying ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
					{isPlaying ? "Pause" : "Play"}
				</Button>
			</div>
			<input
				type="range"
				min={0}
				max={maxFrame}
				value={Math.min(currentFrame, maxFrame)}
				onChange={(e) => onFrameChange(Number(e.target.value))}
				className="w-full"
				disabled={maxFrame <= 0}
			/>
		</div>
	);
}
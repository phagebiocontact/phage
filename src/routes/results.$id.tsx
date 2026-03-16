import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAction, useQuery } from "convex/react";
import JSZip from "jszip";
import {
	Activity,
	AlertTriangle,
	ChevronLeft,
	Clock,
	Download,
	Monitor,
	RefreshCw,
	Terminal,
	Wifi,
	WifiOff,
	Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { LogViewer } from "@/components/LogViewer";
import type { MolstarViewerRef } from "@/components/MolstarViewer";
import MolstarViewer from "@/components/MolstarViewer";
import type { SimulationAnalysisData } from "@/components/SimulationCharts";
import { SimulationCharts } from "@/components/SimulationCharts";
import { TimelineControls } from "@/components/TimelineControls";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { downsample, useSimulationWs, MODAL_API_URL } from "@/hooks/useSimulationWs";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/results/$id")({
	component: Results,
});

type SimulationStatus =
	| "pending"
	| "queued"
	| "running"
	| "completed"
	| "failed"
	| "canceled";

const STATUS_CONFIG: Record<
	SimulationStatus,
	{ color: string; dot: string; label: string }
> = {
	pending: { color: "text-amber-500", dot: "bg-amber-500", label: "Pending" },
	queued: { color: "text-blue-500", dot: "bg-blue-500", label: "Queued" },
	running: {
		color: "text-primary",
		dot: "bg-primary animate-pulse",
		label: "Running",
	},
	completed: {
		color: "text-secondary",
		dot: "bg-secondary",
		label: "Completed",
	},
	failed: { color: "text-destructive", dot: "bg-destructive", label: "Failed" },
	canceled: {
		color: "text-muted-foreground",
		dot: "bg-muted-foreground",
		label: "Canceled",
	},
};

const HEADER_H = 80;

function Results() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const simulation = useQuery(api.simulations.getSimulation, {
		id: id as Id<"simulations">,
	});
	const checkStatus = useAction(api.actions.checkJobStatus);
	const molstarRef = useRef<MolstarViewerRef>(null);

	const [currentFrame, setCurrentFrame] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);
	const [representation, setRepresentation] = useState<
		"cartoon" | "ball-and-stick" | "surface"
	>("cartoon");
	const [colorMode, setColorMode] = useState<"chain" | "element" | "rainbow">(
		"chain",
	);
	const [isRefreshing, setIsRefreshing] = useState(false);

	type SimArtifacts = {
		structurePdb?: string;
		trajectoryXtc?: string;
		resultTar?: string;
		rmsdPng?: string;
		rmsfPng?: string;
		rgPng?: string;
		ssPng?: string;
		energyPng?: string;
	};
	type SimData = {
		_id: string;
		name: string;
		status: string;
		modalJobId?: string;
		progressPercent?: number;
		currentStep?: string;
		timeElapsedSeconds?: number;
		artifacts?: SimArtifacts;
		analysisData?: SimulationAnalysisData;
		errorSummary?: string;
		errorRaw?: string;
		logTail?: string;
	};

	const sim = simulation as SimData | null;
	const status = (sim?.status as SimulationStatus | undefined) ?? "pending";
	const statusConfig = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
	const modalJobId = sim?.modalJobId ?? null;

	const {
		wsStatus,
		wsConnected,
		liveLogs,
		topologyPdb,
		atomCount,
		slotCount,
		loadedFrames,
		usesRingBuffer,
		analysisData: streamedAnalysis,
		getFrame,
	} = useSimulationWs({
		modalJobId,
		enabled: !!simulation && !!modalJobId,
	});

	const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
	const [playbackSpeed, setPlaybackSpeed] = useState(1);
	const [waterVisible, setWaterVisible] = useState(true);

	useEffect(() => {
		if (loadedFrames > 0 && !hasAutoPlayed) {
			setIsPlaying(true);
			setHasAutoPlayed(true);
		}
	}, [loadedFrames, hasAutoPlayed]);

	useEffect(() => {
		if (!isPlaying || loadedFrames < 2) return;
		const interval = window.setInterval(() => {
			setCurrentFrame((prev) => {
				if (prev >= loadedFrames - 1) {
					setIsPlaying(false);
					return prev;
				}
				return prev + 1;
			});
		}, 200 / playbackSpeed);
		return () => window.clearInterval(interval);
	}, [isPlaying, loadedFrames, playbackSpeed]);

	const activeFrame = getFrame(
		Math.min(currentFrame, Math.max(0, loadedFrames - 1)),
	);
	const activeCoords = activeFrame?.coords ?? null;

	const isStaticAnalysis = !!sim?.analysisData && (sim.analysisData.rmsd?.length ?? 0) > 0;

	const analysisData: SimulationAnalysisData = useMemo(() => {
		const preferExisting = (simData: any[] | undefined, streamData: any[]) =>
			simData && simData.length > 0 ? simData : streamData;

		return {
			rmsd: downsample(
				preferExisting(sim?.analysisData?.rmsd, streamedAnalysis.rmsd),
				200,
			),
			ligandRmsd: downsample(
				preferExisting(sim?.analysisData?.ligandRmsd, streamedAnalysis.ligandRmsd),
				200,
			),
			rg: downsample(
				preferExisting(sim?.analysisData?.rg, streamedAnalysis.rg),
				200,
			),
			energy: downsample(
				preferExisting(sim?.analysisData?.energy, streamedAnalysis.energy),
				200,
			),
			ss: downsample(
				preferExisting(sim?.analysisData?.ss, streamedAnalysis.ss),
				200,
			),
			rmsf: downsample(
				preferExisting(sim?.analysisData?.rmsf, streamedAnalysis.rmsf),
				400,
			),
		};
	}, [isStaticAnalysis ? sim?.analysisData : streamedAnalysis]);

	const liveProgress = wsStatus?.progress_percent ?? sim?.progressPercent ?? 0;
	const liveStep =
		wsStatus?.current_step ?? sim?.currentStep ?? "Preparing Stream";
	const liveElapsed = wsStatus?.time_elapsed_seconds ?? sim?.timeElapsedSeconds;
	const liveSpeed = wsStatus?.speed_ns_per_day;
	const displayLogs = liveLogs.length
		? liveLogs.join("\n")
		: (sim?.logTail ?? "Waiting for stream...");

	const handleRefresh = async () => {
		setIsRefreshing(true);
		try {
			await checkStatus({ simulationId: id as Id<"simulations"> });
			toast.success("Status refreshed");
		} catch {
			toast.error("Refresh failed");
		} finally {
			setIsRefreshing(false);
		}
	};

	const handleDownloadTar = async () => {
		if (!sim?.artifacts) {
			toast.error("Results archive not available yet");
			return;
		}
		try {
			const zip = new JSZip();
			const convexUrl = (await import("@/lib/convex")).convex;
			const { api: convexApi } = await import("../../convex/_generated/api");
			await Promise.all(
				Object.entries(sim.artifacts).map(async ([key, storageId]) => {
					if (!storageId || key === "resultTar") return;
					const url = await convexUrl.mutation(
						convexApi.results.getResultsDownloadUrl,
						{
							storageId: storageId as Id<"_storage">,
						},
					);
					if (!url) return;
					const res = await fetch(url);
					zip.file(key, await res.blob());
				}),
			);
			const zipBlob = await zip.generateAsync({ type: "blob" });
			const a = document.createElement("a");
			a.href = URL.createObjectURL(zipBlob);
			a.download = "results.zip";
			a.click();
		} catch {
			toast.error("Download failed");
		}
	};

	const handleDownloadPng = useCallback(
		(metric: "rmsd" | "ligandRmsd" | "rmsf" | "rg" | "ss" | "energy") => {
			const fileMap: Record<string, string> = {
				rmsd: "rmsd_hq.png",
				ligandRmsd: "ligand_rmsd_hq.png",
				rmsf: "rmsf_hq.png",
				rg: "rg_hq.png",
				ss: "ss_hq.png",
				energy: "energy_hq.png",
			};
			const p = fileMap[metric];
			if (modalJobId && p) {
				const url = `${MODAL_API_URL}/jobs/${modalJobId}/files/${p}`;
				const a = document.createElement("a");
				a.href = url;
				a.download = p;
				a.target = "_blank";
				a.click();
			} else {
				toast.error("High quality plot not available yet");
			}
		},
		[modalJobId],
	);

	const applyRepresentation = useCallback(
		(value: "cartoon" | "ball-and-stick" | "surface") => {
			setRepresentation(value);
			molstarRef.current?.setRepresentation(value);
		},
		[],
	);

	const applyColor = useCallback((value: "chain" | "element" | "rainbow") => {
		setColorMode(value);
		molstarRef.current?.setColor(value);
	}, []);

	if (simulation === undefined) {
		return (
			<div
				className="min-h-screen bg-background flex items-center justify-center"
				style={{ paddingTop: HEADER_H }}
			>
				<div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
			</div>
		);
	}

	if (!simulation) {
		return (
			<div
				className="min-h-screen bg-background flex items-center justify-center"
				style={{ paddingTop: HEADER_H }}
			>
				<Card className="p-10 text-center border-border/40">
					<AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-4" />
					<h2 className="text-xl font-semibold mb-2">Simulation Not Found</h2>
					<Button variant="outline" onClick={() => navigate({ to: "/jobs" })}>
						Back to Jobs
					</Button>
				</Card>
			</div>
		);
	}

	return (
		<div className="bg-background" style={{ paddingTop: HEADER_H }}>
			<div className="border-b border-border/40 bg-background/90 backdrop-blur-sm">
				<div className="container mx-auto px-4 max-w-[1480px] h-12 flex items-center justify-between gap-4">
					<div className="flex items-center gap-3 min-w-0">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => navigate({ to: "/jobs" })}
							className="-ml-2 h-7 text-muted-foreground hover:text-foreground gap-1 shrink-0"
						>
							<ChevronLeft className="h-3.5 w-3.5" /> Jobs
						</Button>
						<span className="text-border shrink-0">·</span>
						<h1 className="text-sm font-semibold truncate">{sim.name}</h1>
						<div className="flex items-center gap-1.5 shrink-0">
							<span className={`h-2 w-2 rounded-full ${statusConfig.dot}`} />
							<span className={`text-xs font-medium ${statusConfig.color}`}>
								{statusConfig.label}
							</span>
						</div>
					</div>
					<div className="flex items-center gap-2 shrink-0">
						<span
							className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${wsConnected
									? "text-secondary border-secondary/30 bg-secondary/5"
									: "text-muted-foreground border-border/50"
								}`}
						>
							{wsConnected ? (
								<>
									<Wifi className="h-3 w-3" /> Binary Live
								</>
							) : (
								<>
									<WifiOff className="h-3 w-3" /> Reconnecting
								</>
							)}
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={handleRefresh}
							disabled={isRefreshing}
							className="h-7 text-xs gap-1.5"
						>
							<RefreshCw
								className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`}
							/>{" "}
							Refresh
						</Button>
						{status === "completed" && (
							<Button
								size="sm"
								onClick={handleDownloadTar}
								className="h-7 text-xs gap-1.5 bg-gradient-primary hover:opacity-90"
							>
								<Download className="h-3 w-3" /> Download All
							</Button>
						)}
					</div>
				</div>
			</div>

			<div className="border-b border-border/30 overflow-hidden">
				<div className="container mx-auto px-4 max-w-[1480px] py-3">
					<div className="flex items-center justify-between mb-2">
						<div className="flex items-center gap-2">
							<Activity className="h-3.5 w-3.5 text-primary animate-pulse" />
							<span className="text-xs font-medium text-muted-foreground">
								{liveStep}
							</span>
						</div>
						<div className="flex items-center gap-4">
							{liveSpeed != null && liveSpeed > 0 && (
								<span className="flex items-center gap-1 text-xs text-primary/70 font-mono">
									<Zap className="h-3 w-3" />
									{liveSpeed.toFixed(1)} ns/day
								</span>
							)}
							{liveElapsed != null && (
								<span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
									<Clock className="h-3 w-3" />
									{Math.floor(liveElapsed)}s
								</span>
							)}
							<span className="text-sm font-bold tabular-nums">
								{Math.round(liveProgress)}%
							</span>
						</div>
					</div>
					<div className="relative h-1.5 rounded-full bg-primary/10 overflow-hidden">
						<motion.div
							className="absolute inset-y-0 left-0 rounded-full bg-gradient-primary"
							animate={{ width: `${liveProgress}%` }}
							transition={{ duration: 0.7, ease: "easeOut" }}
						/>
					</div>
				</div>
			</div>

			<div className="container mx-auto px-4 max-w-[1480px] py-6 space-y-6 pb-16">
				<Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
					<CardHeader className="py-4 px-5 border-b border-border/20">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<CardTitle className="text-lg font-semibold flex items-center gap-2">
									<Monitor className="h-4 w-4 text-primary" />
									{status === "completed"
										? "Final Trajectory Stream"
										: "Transitioning To Final Trajectory"}
									<span className="font-normal text-muted-foreground text-xs ml-1">
										{loadedFrames > 0
											? `slot ${Math.min(currentFrame + 1, loadedFrames)} / ${slotCount || loadedFrames}`
											: "awaiting first slot"}
									</span>
								</CardTitle>
								<p className="text-xs text-muted-foreground mt-1">
									Interactive trajectory view
									{usesRingBuffer ? " · typed ring buffer active" : ""}
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<div className="flex gap-0.5 bg-muted/50 rounded-md p-0.5 border border-border/30">
									{(["cartoon", "ball-and-stick", "surface"] as const).map(
										(type) => (
											<button
												key={type}
												type="button"
												onClick={() => applyRepresentation(type)}
												className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-all ${representation === type
														? "bg-primary text-primary-foreground shadow-sm"
														: "text-muted-foreground hover:text-foreground hover:bg-muted"
													}`}
											>
												{type.replace("-", " ")}
											</button>
										),
									)}
								</div>
								<div className="flex gap-0.5 bg-muted/50 rounded-md p-0.5 border border-border/30">
									{(["chain", "element", "rainbow"] as const).map((type) => (
										<button
											key={type}
											type="button"
											onClick={() => applyColor(type)}
											className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-all ${colorMode === type
													? "bg-secondary text-secondary-foreground shadow-sm"
													: "text-muted-foreground hover:text-foreground hover:bg-muted"
												}`}
										>
											{type}
										</button>
									))}
								</div>
								<Button
									variant="outline"
									size="sm"
									className="px-2.5 h-7 text-xs"
									onClick={() => molstarRef.current?.focusLigand()}
								>
									Focus Ligand
								</Button>
								<Button
									variant={waterVisible ? "outline" : "secondary"}
									size="sm"
									className="px-2.5 h-7 text-xs"
									onClick={() => {
										const target = !waterVisible;
										molstarRef.current?.setWaterVisibility(target);
										setWaterVisible(target);
									}}
								>
									{waterVisible ? "Hide Water" : "Show Water"}
								</Button>
								<Button
									variant="outline"
									size="sm"
									className="px-2.5 h-7 text-xs"
									onClick={() => molstarRef.current?.resetZoom()}
								>
									Reset View
								</Button>
							</div>
						</div>
					</CardHeader>
					<CardContent className="p-0">
						<div
							className="relative border-b border-border/20"
							style={{ height: "60vh", minHeight: 500 }}
						>
							{topologyPdb && atomCount > 0 ? (
								<MolstarViewer
									ref={molstarRef}
									topologyPdb={topologyPdb}
									coordinates={activeCoords}
									atomCount={atomCount}
									className="w-full h-full"
								/>
							) : (
								<div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
									<div className="flex flex-col items-center gap-3 text-muted-foreground">
										<RefreshCw className="h-8 w-8 animate-spin opacity-50" />
										<p className="text-sm">
											Loading topology and initializing binary stream…
										</p>
									</div>
								</div>
							)}
						</div>
						<TimelineControls
							currentFrame={Math.min(
								currentFrame,
								Math.max(0, loadedFrames - 1),
							)}
							totalFrames={Math.max(slotCount, loadedFrames)}
							isPlaying={isPlaying}
							onFrameChange={(frame) => {
								setIsPlaying(false);
								setCurrentFrame(frame);
							}}
							onPlay={() => setIsPlaying(true)}
							onPause={() => setIsPlaying(false)}
							playbackSpeed={playbackSpeed}
							onSpeedChange={setPlaybackSpeed}
						/>
					</CardContent>
				</Card>

				<SimulationCharts data={analysisData} onDownloadPng={handleDownloadPng} />

				<Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
					<CardHeader className="py-3 px-4 border-b border-border/20">
						<CardTitle className="text-sm font-semibold flex items-center gap-2">
							<Terminal className="h-4 w-4 text-primary" />
							Streaming Diagnostics
						</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<LogViewer
							content={displayLogs}
							maxHeight="40vh"
							isLive={wsConnected && status !== "completed"}
						/>
					</CardContent>
				</Card>

				{status === "failed" && sim?.errorRaw && (
					<Card className="border-destructive/30 bg-destructive/5">
						<CardContent className="pt-6">
							<p className="text-sm font-semibold text-destructive mb-2">
								Simulation Failed
							</p>
							<pre className="text-xs text-destructive/80 whitespace-pre-wrap font-mono">
								{sim.errorRaw}
							</pre>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}

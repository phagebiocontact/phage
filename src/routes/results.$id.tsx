import { createFileRoute, useNavigate } from "@tanstack/react-router";
import JSZip from "jszip";
import { useAction, useQuery } from "convex/react";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  Download,
  FlaskConical,
  Monitor,
  RefreshCw,
  Terminal,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { LogViewer } from "@/components/LogViewer";
import { useSimulationWs, downsample } from "@/hooks/useSimulationWs";
import type { MolstarViewerRef } from "@/components/MolstarViewer";
import MolstarViewer from "@/components/MolstarViewer";
import type { SimulationAnalysisData } from "@/components/SimulationCharts";
import { SimulationCharts } from "@/components/SimulationCharts";
import { TimelineControls } from "@/components/TimelineControls";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";



export const Route = createFileRoute("/results/$id")({
  component: Results,
});

type SimulationStatus = "pending" | "queued" | "running" | "completed" | "failed" | "canceled";
type DisplayStatus = SimulationStatus | "finalizing";

const STATUS_CONFIG: Record<DisplayStatus, { color: string; dot: string; label: string }> = {
  pending: { color: "text-amber-500", dot: "bg-amber-500", label: "Pending" },
  queued: { color: "text-blue-500", dot: "bg-blue-500", label: "Queued" },
  running: { color: "text-primary", dot: "bg-primary animate-pulse", label: "Running" },
  completed: { color: "text-secondary", dot: "bg-secondary", label: "Completed" },
  failed: { color: "text-destructive", dot: "bg-destructive", label: "Failed" },
  canceled: { color: "text-muted-foreground", dot: "bg-muted-foreground", label: "Canceled" },
  finalizing: { color: "text-amber-500", dot: "bg-amber-500 animate-pulse", label: "Finalizing…" },
};

const HEADER_H = 80; // global fixed header height in px

function Results() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const simulation = useQuery(api.simulations.getSimulation, { id: id as Id<"simulations"> });
  const checkStatus = useAction(api.actions.checkJobStatus);

  const rawStatus = simulation?.status ?? "";
  const isTerminalStatus = ["completed", "failed", "canceled"].includes(rawStatus);
  const hasArtifacts = !!(simulation as { artifacts?: object })?.artifacts;
  const isFinalizing = rawStatus === "completed" && !hasArtifacts;

  const { wsStatus, wsConnected, liveLogs, livePdbBase64, liveTrajectoryFrame, liveAnalysisPoints } = useSimulationWs({
    modalJobId: (simulation as { modalJobId?: string })?.modalJobId,
    enabled: !isTerminalStatus && !!simulation,
  });

  const molstarRef = useRef<MolstarViewerRef>(null);
  const [representation, setRepresentation] = useState<"cartoon" | "ball-and-stick" | "surface">("cartoon");
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorExpanded, setErrorExpanded] = useState(false);

  type SimArtifacts = {
    structurePdb?: string; trajectoryXtc?: string; resultTar?: string;
    rmsdPng?: string; rmsfPng?: string; rgPng?: string; ssPng?: string; energyPng?: string;
  };
  type SimData = {
    _id: string; name: string; status: string;
    parameters: { temperature: number; duration: number; timestep: number; ensemble: string };
    creditsReserved: number; creditsCaptured?: number;
    progressPercent?: number; currentStep?: string; timeElapsedSeconds?: number;
    artifacts?: SimArtifacts;
    analysisData?: { rmsd?: unknown[]; rmsf?: unknown[]; rg?: unknown[]; energy?: unknown[]; ss?: unknown[] };
    errorSummary?: string; errorRaw?: string; logTail?: string;
  };
  const sim = simulation as SimData | null;
  const artifacts = sim?.artifacts;

  const structureUrl = useQuery(
    api.simulations.getArtifactUrl,
    artifacts?.structurePdb && simulation
      ? { simulationId: simulation._id, storageId: artifacts.structurePdb as Id<"_storage"> } : "skip"
  );
  // modalJobId drives the frame API
  const modalJobId = (simulation as { modalJobId?: string })?.modalJobId ?? null;

  // Derive live RMSF from the most recent analysis point that carries rmsf[]
  const latestRmsf = [...liveAnalysisPoints].reverse().find(p => p.rmsf && p.rmsf.length > 0)?.rmsf;
  const liveRmsfData = latestRmsf?.map((value, residue) => ({ residue, value }));

  const liveAnalysisData: SimulationAnalysisData = {
    rmsd: liveAnalysisPoints.filter(p => p.rmsd != null).map(p => ({ frame: p.frame, time: p.time_ns, value: p.rmsd ?? 0 })),
    rg: liveAnalysisPoints.filter(p => p.rg != null).map(p => ({ frame: p.frame, time: p.time_ns, value: p.rg ?? 0 })),
    energy: liveAnalysisPoints.filter(p => p.potential != null).map(p => ({ frame: p.frame, time: p.time_ns, potential: p.potential ?? 0, kinetic: p.kinetic ?? 0, total: p.total ?? 0 })),
    ss: liveAnalysisPoints.filter(p => p.helix != null).map(p => ({ frame: p.frame, time: p.time_ns, helix: p.helix ?? 0, sheet: p.sheet ?? 0, coil: p.coil ?? 0 })),
    rmsf: liveRmsfData,
  };

  const wsAnalysis = wsStatus?.analysis_data as Record<string, unknown> | undefined;
  const analysisData: SimulationAnalysisData = {
    rmsd: downsample((sim?.analysisData?.rmsd ?? wsAnalysis?.rmsd) as SimulationAnalysisData["rmsd"], 200),
    rmsf: downsample((sim?.analysisData?.rmsf ?? wsAnalysis?.rmsf) as SimulationAnalysisData["rmsf"], 200),
    rg: downsample((sim?.analysisData?.rg ?? wsAnalysis?.radiusOfGyration) as SimulationAnalysisData["rg"], 200),
    energy: downsample((sim?.analysisData?.energy ?? wsAnalysis?.energy) as SimulationAnalysisData["energy"], 200),
    ss: downsample((sim?.analysisData?.ss ?? wsAnalysis?.dssp) as SimulationAnalysisData["ss"], 200),
  };
  const hasLiveAnalysis = liveAnalysisPoints.length > 0;

  const liveProgress = wsStatus?.progress_percent ?? simulation?.progressPercent ?? 0;
  const liveStep = wsStatus?.current_step ?? simulation?.currentStep;
  const liveElapsed = wsStatus?.time_elapsed_seconds ?? simulation?.timeElapsedSeconds;
  const liveSpeed = wsStatus?.speed_ns_per_day;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await checkStatus({ simulationId: id as Id<"simulations"> }); toast.success("Status refreshed"); }
    catch { toast.error("Refresh failed"); }
    finally { setIsRefreshing(false); }
  };

  const handleFrameChange = useCallback((frame: number, total: number) => {
    setCurrentFrame(frame);
    if (total > 0) setTotalFrames(total);
  }, []);

  const handleTimelineFrame = useCallback((frame: number) => {
    setCurrentFrame(frame);
    molstarRef.current?.setFrame(frame);
  }, []);

  const handlePlay = useCallback(() => { setIsPlaying(true); molstarRef.current?.play(); }, []);
  const handlePause = useCallback(() => { setIsPlaying(false); molstarRef.current?.pause(); }, []);


  const handleRepresentationChange = (type: "cartoon" | "ball-and-stick" | "surface") => {
    setRepresentation(type);
    molstarRef.current?.setRepresentation(type);
  };

  const downloadArtifact = async (storageId: Id<"_storage">, filename: string) => {
    if (!simulation) return;
    try {
      toast.info("Preparing download…");
      const convexUrl = (await import("@/lib/convex")).convex;
      const { api: convexApi } = await import("../../convex/_generated/api");
      const url = await convexUrl.mutation(convexApi.results.getResultsDownloadUrl, { storageId });
      if (url) { const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); }
    } catch { toast.error("Download failed"); }
  };

  const handleDownloadPng = async (metric: "rmsd" | "rmsf" | "rg" | "ss" | "energy") => {
    const keyMap: Record<string, string> = { rmsd: "rmsdPng", rmsf: "rmsfPng", rg: "rgPng", ss: "ssPng", energy: "energyPng" };
    const storageId = artifacts?.[keyMap[metric] as keyof SimArtifacts];
    if (!storageId) { toast.error(`${metric.toUpperCase()} PNG not available`); return; }
    await downloadArtifact(storageId, `${metric}.png`);
  };

  const handleDownloadTar = async () => {
    if (!artifacts) { toast.error("Results archive not available yet"); return; }
    toast.info("Preparing results archive…");
    try {
      const zip = new JSZip();
      const convexUrl = (await import("@/lib/convex")).convex;
      const { api: convexApi } = await import("../../convex/_generated/api");
      await Promise.all(Object.entries(artifacts).map(async ([key, storageId]) => {
        if (!storageId || key === "resultTar") return;
        const url = await convexUrl.mutation(convexApi.results.getResultsDownloadUrl, { storageId: storageId as Id<"_storage"> });
        if (url) {
          const res = await fetch(url); const blob = await res.blob();
          let fn = key;
          if (key === "structurePdb") fn = "complex.pdb";
          else if (key === "trajectoryXtc") fn = "prod.xtc";
          else if (key === "simulationLog") fn = "simulation.log";
          else if (key.endsWith("Csv")) fn = key.replace("Csv", ".csv");
          else if (key.endsWith("Png")) fn = key.replace("Png", ".png");
          zip.file(fn, blob);
        }
      }));
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(zipBlob); a.download = "results.zip"; a.click();
      toast.success("Results downloaded");
    } catch { toast.error("Download failed"); }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (simulation === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" style={{ paddingTop: HEADER_H }}>
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading simulation…</p>
        </div>
      </div>
    );
  }

  if (!simulation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" style={{ paddingTop: HEADER_H }}>
        <Card className="p-10 text-center border-border/40">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Simulation Not Found</h2>
          <p className="text-muted-foreground text-sm mb-6">This simulation doesn't exist or you don't have access.</p>
          <Button variant="outline" onClick={() => navigate({ to: "/jobs" })}>Back to Jobs</Button>
        </Card>
      </div>
    );
  }

  const status = simulation.status as SimulationStatus;
  const displayStatus: DisplayStatus = isFinalizing ? "finalizing" : status;
  const statusConfig = STATUS_CONFIG[displayStatus] ?? STATUS_CONFIG.pending;
  const isTerminal = ["completed", "failed", "canceled"].includes(status);
  const isCompleted = status === "completed";
  const isFailed = status === "failed";

  return (
    <div className="bg-background" style={{ paddingTop: HEADER_H }}>

      {/* ── Sub-header ── */}
      <div className={`${!isTerminal ? "top-[80px] z-30" : ""} border-b border-border/40 bg-background/90 backdrop-blur-sm`}>
        <div className="container mx-auto px-4 max-w-[1400px] h-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/jobs" })}
              className="-ml-2 h-7 text-muted-foreground hover:text-foreground gap-1 shrink-0">
              <ChevronLeft className="h-3.5 w-3.5" /> Jobs
            </Button>
            <span className="text-border shrink-0">·</span>
            <h1 className="text-sm font-semibold truncate">{simulation.name}</h1>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`h-2 w-2 rounded-full ${statusConfig.dot}`} />
              <span className={`text-xs font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isTerminal && (
              <span className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${wsConnected ? "text-secondary border-secondary/30 bg-secondary/5" : "text-muted-foreground border-border/50"
                }`}>
                {wsConnected ? <><Wifi className="h-3 w-3" /> Live</> : <><WifiOff className="h-3 w-3" /> Polling</>}
              </span>
            )}
            {!isTerminal && (
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="h-7 text-xs gap-1.5">
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} /> Refresh
              </Button>
            )}
            {isCompleted && (
              <Button size="sm" onClick={handleDownloadTar} className="h-7 text-xs gap-1.5 bg-gradient-primary hover:opacity-90">
                <Download className="h-3 w-3" /> Download All
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <AnimatePresence>
        {(isFinalizing || !isTerminal) && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="border-b border-border/30 overflow-hidden">
            <div className="container mx-auto px-4 max-w-[1400px] py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-primary animate-pulse" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {isFinalizing ? "Finalizing results…" : (liveStep ?? "Simulation Progress")}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {liveSpeed != null && liveSpeed > 0 && (
                    <span className="flex items-center gap-1 text-xs text-primary/70 font-mono">
                      <Zap className="h-3 w-3" />{liveSpeed.toFixed(1)} ns/day
                    </span>
                  )}
                  {liveElapsed != null && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                      <Clock className="h-3 w-3" />{Math.floor(liveElapsed)}s
                    </span>
                  )}
                  <span className="text-sm font-bold tabular-nums">{Math.round(liveProgress)}%</span>
                </div>
              </div>
              <div className="relative h-1.5 rounded-full bg-primary/10 overflow-hidden">
                <motion.div className="absolute inset-y-0 left-0 rounded-full bg-gradient-primary"
                  animate={{ width: `${liveProgress}%` }} transition={{ duration: 0.7, ease: "easeOut" }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Failed error ── */}
      <AnimatePresence>
        {isFailed && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="border-b border-destructive/20 bg-destructive/5">
            <div className="container mx-auto px-4 max-w-[1400px] py-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-destructive mb-0.5">Simulation Failed</p>
                  <p className="text-xs text-muted-foreground">{sim?.errorSummary ?? "The simulation encountered an error."}</p>
                  {sim?.errorRaw && (
                    <button type="button" className="flex items-center gap-1 mt-1.5 text-xs text-destructive/60 hover:text-destructive transition-colors"
                      onClick={() => setErrorExpanded(v => !v)}>
                      {errorExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {errorExpanded ? "Hide" : "Show"} technical details
                    </button>
                  )}
                  <AnimatePresence>
                    {errorExpanded && sim?.errorRaw && (
                      <motion.pre initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="mt-2 p-3 bg-black/30 rounded-lg text-xs text-destructive/70 font-mono overflow-auto max-h-40 whitespace-pre-wrap">
                        {sim.errorRaw}
                      </motion.pre>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main scrollable content ── */}
      <div className="container mx-auto px-4 max-w-[1400px] py-6 space-y-6 pb-16">

        {/* ── COMPLETED ── */}
        {(isCompleted && !isFinalizing) ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
            className="space-y-6">

            {/* Trajectory viewer — full width, tall */}
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
              <CardHeader className="py-3 px-4 border-b border-border/20">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-primary" />
                    MD Trajectory
                    {totalFrames > 0 && (
                      <span className="font-normal text-muted-foreground text-xs ml-1">
                        — frame {currentFrame + 1} / {totalFrames}
                      </span>
                    )}
                  </CardTitle>
                  <div className="flex gap-0.5 bg-muted/50 rounded-md p-0.5 border border-border/30">
                    {(["cartoon", "ball-and-stick", "surface"] as const).map((type) => (
                      <button key={type} type="button" onClick={() => handleRepresentationChange(type)}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-all ${representation === type
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}>
                        {type.replace("-", " ")}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Viewer at full width, fixed tall height */}
                <div className="relative" style={{ height: "60vh", minHeight: 480 }}>
                  <MolstarViewer
                    ref={molstarRef}
                    structureUrl={structureUrl ?? undefined}
                    modalJobId={modalJobId ?? undefined}
                    className="w-full h-full"
                    onFrameChange={handleFrameChange}
                  />
                  {!structureUrl && !modalJobId && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <RefreshCw className="h-8 w-8 animate-spin opacity-50" />
                        <p className="text-sm">Loading structure files…</p>
                      </div>
                    </div>
                  )}
                </div>
                <TimelineControls
                  currentFrame={currentFrame}
                  totalFrames={totalFrames}
                  isPlaying={isPlaying}
                  onFrameChange={handleTimelineFrame}
                  onPlay={handlePlay}
                  onPause={handlePause}
                />
              </CardContent>
            </Card>

            {/* Analysis charts — full width, stacked vertically */}
            <SimulationCharts
              data={analysisData}
              onDownloadPng={handleDownloadPng}
            />
          </motion.div>

        ) : isFailed && sim?.logTail ? (
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b border-border/20">
              <CardTitle className="text-sm text-destructive flex items-center gap-2">
                <Terminal className="h-4 w-4" /> Error Log
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <LogViewer content={sim.logTail ?? ""} maxHeight="480px" />
            </CardContent>
          </Card>

        ) : isFinalizing ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center space-y-5">
              <div className="relative mx-auto w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-t-primary border-transparent animate-spin" />
              </div>
              <div>
                <p className="text-base font-semibold">Transferring Results</p>
                <p className="text-sm text-muted-foreground mt-1">Uploading trajectory, analysis, and logs…</p>
                <p className="text-xs text-muted-foreground/60 mt-3 font-mono">This usually takes 10–30 seconds</p>
              </div>
            </div>
          </div>

        ) : (
          /* RUNNING — live viewer + live analysis + live logs */
          <Tabs defaultValue="trajectory" className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList className="bg-muted/50 border border-border/30">
                <TabsTrigger value="trajectory" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Trajectory
                </TabsTrigger>
                <TabsTrigger value="analysis" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Analysis
                </TabsTrigger>
                <TabsTrigger value="logs" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Live Logs
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="trajectory" className="m-0 focus-visible:outline-none">
              <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="py-3 px-4 border-b border-border/20">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    Live Structure Preview
                    {livePdbBase64 && (
                      <span className="font-normal text-muted-foreground text-xs">— frame {liveTrajectoryFrame}</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="relative" style={{ height: "60vh", minHeight: 480 }}>
                    {livePdbBase64 ? (
                      <MolstarViewer
                        ref={molstarRef}
                        livePdbBase64={livePdbBase64}
                        className="w-full h-full"
                        onFrameChange={handleFrameChange}
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-muted-foreground/50">
                        <Monitor className="h-12 w-12 opacity-25" />
                        <div className="text-center">
                          <p className="text-sm font-medium">Awaiting structure preview</p>
                          <p className="text-xs mt-1">Appears after the first 1,000 simulation steps</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analysis" className="m-0 focus-visible:outline-none">
              <div className="flex items-center gap-2 mb-4">
                <FlaskConical className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Live Analysis</h2>
                {hasLiveAnalysis && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
              </div>
              {hasLiveAnalysis ? (
                <SimulationCharts data={liveAnalysisData} />
              ) : (
                <Card className="border-border/30 border-dashed bg-card/20 flex items-center justify-center py-20">
                  <div className="text-center text-muted-foreground/40">
                    <FlaskConical className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Charts will appear once production run starts</p>
                  </div>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="logs" className="m-0 focus-visible:outline-none">
              <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="py-3 px-4 border-b border-border/20">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-primary" />
                    Simulation Logs
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <LogViewer content={liveLogs.length > 0 ? liveLogs.join("\n") : "Connecting to simulation..."} maxHeight="60vh" isLive={wsConnected} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
